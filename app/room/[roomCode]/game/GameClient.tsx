'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  Send,
  ArrowDownLeft,
  ScanLine,
  QrCode,
  Wallet,
  Users,
  Activity,
  Landmark,
  Trophy,
  Dice5,
  Volume2,
  VolumeX,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import {
  respondToPaymentRequest,
  rollDice,
  type Room,
  type Player,
} from '@/app/actions';
import type { Transaction, PaymentRequest, GameEvent } from '@/lib/game-types';
import { formatMoney } from '@/lib/player-colors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import AppShell from '@/components/AppShell';
import CopyButton from '@/components/CopyButton';
import OperationSheet from '@/components/OperationSheet';
import BankPanel from '@/components/BankPanel';
import { PlayerAvatar } from '@/components/PlayerSelector';
import PlayerBalanceCard from '@/components/game/PlayerBalanceCard';
import SendMoneyForm from '@/components/game/SendMoneyForm';
import QRRequestForm from '@/components/game/QRRequestForm';
import BankServices from '@/components/game/BankServices';
import ActivityFeed from '@/components/game/ActivityFeed';
const ScanQRForm = dynamic(() => import('@/components/game/ScanQRForm'), {
  ssr: false,
  loading: () => <p role="status">Loading scanner...</p>,
});
type Operation = 'send' | 'request' | 'scan' | 'qr' | 'services' | 'requests';
export default function GameClient({
  room: initialRoom,
  currentPlayer: initialPlayer,
  players: initialPlayers,
  transactions: initialTransactions,
  gameEvents: initialEvents,
}: {
  room: Room;
  currentPlayer: Player;
  players: Player[];
  transactions: Transaction[];
  gameEvents: GameEvent[];
}) {
  const [room, setRoom] = useState(initialRoom);
  const [players, setPlayers] = useState(initialPlayers);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [gameEvents, setGameEvents] = useState(initialEvents);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [connection, setConnection] = useState('Connecting');
  const [activeTab, setActiveTab] = useState('wallet');
  const [operation, setOperation] = useState<Operation | null>(null);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const player =
    players.find((candidate) => candidate.id === initialPlayer.id) ??
    initialPlayer;
  const defeated = player.status === 'defeated';
  const pendingRequests = requests.filter(
    (request) =>
      request.status === 'pending' &&
      request.from_player_id !== player.id &&
      (request.to_player_id === player.id || request.to_player_id === null),
  );
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setMuted(localStorage.getItem('banko_muted') === 'true');
      } catch {}
    });
  }, []);
  useEffect(() => {
    let active = true;
    async function refresh() {
      const results = await Promise.all([
        supabase.from('rooms').select('*').eq('id', initialRoom.id).single(),
        supabase
          .from('players')
          .select('*')
          .eq('room_id', initialRoom.id)
          .order('created_at'),
        supabase
          .from('transactions')
          .select(
            '*, from_player:players!from_player_id(nickname), to_player:players!to_player_id(nickname)',
          )
          .eq('room_id', initialRoom.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('payment_requests')
          .select('*, from_player:players!from_player_id(nickname)')
          .eq('room_id', initialRoom.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('game_events')
          .select('*, player:players(nickname)')
          .eq('room_id', initialRoom.id)
          .order('created_at', { ascending: false })
          .limit(50),
      ]);
      if (!active) return;
      if (results.some((result) => result.error)) {
        setConnection('Reconnecting');
        return;
      }
      const [
        roomResult,
        playersResult,
        transactionsResult,
        requestsResult,
        eventsResult,
      ] = results;
      if (roomResult.data) {
        setRoom(roomResult.data);
        if (roomResult.data.status === 'finished')
          router.push('/room/' + initialRoom.room_code + '/finish');
      }
      if (playersResult.data) setPlayers(playersResult.data);
      if (transactionsResult.data) setTransactions(transactionsResult.data);
      if (requestsResult.data) setRequests(requestsResult.data);
      if (eventsResult.data) setGameEvents(eventsResult.data);
    }
    const channel = supabase
      .channel('game-' + initialRoom.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: 'room_id=eq.' + initialRoom.id,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: 'id=eq.' + initialRoom.id,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_requests',
          filter: 'room_id=eq.' + initialRoom.id,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_events',
          filter: 'room_id=eq.' + initialRoom.id,
        },
        () => void refresh(),
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: 'room_id=eq.' + initialRoom.id,
        },
        (payload) => {
          if (payload.new.to_player_id === initialPlayer.id) {
            toast.success('Money received', {
              description:
                formatMoney(Number(payload.new.amount)) + ' added to your card',
            });
            if (!muted) {
              const audio = new Audio('/assets/sounds/success.mp3');
              audio.volume = 0.5;
              void audio.play().catch(() => {});
            }
          }
          if (
            payload.new.type === 'player_to_bank' &&
            payload.new.from_player_id === initialPlayer.id
          ) {
            toast('Paid bank', {
              description:
                formatMoney(Number(payload.new.amount)) +
                ' / ' +
                (payload.new.description || 'Bank collection'),
            });
            if (!muted) {
              const audio = new Audio('/assets/sounds/error.mp3');
              audio.volume = 0.5;
              void audio.play().catch(() => {});
            }
          }
          void refresh();
        },
      )
      .subscribe((status) => {
        if (active) {
          setConnection(status === 'SUBSCRIBED' ? 'Live' : 'Reconnecting');
          if (status === 'SUBSCRIBED') void refresh();
        }
      });
    void refresh();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [
    supabase,
    initialRoom.id,
    initialRoom.room_code,
    initialPlayer.id,
    router,
    muted,
  ]);
  function openOperation(
    nextOperation: Operation,
    target: string | null = null,
  ) {
    setRecipientId(target);
    setError('');
    setOperation(nextOperation);
  }
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow text-primary">GAME NIGHT, IN PROGRESS</p>
          <h1 className="mt-2">{room.room_name}</h1>
          <div className="flex gap-3 items-center mt-3">
            <span className="text-sm text-muted-foreground">
              {room.room_code}
            </span>
            <Badge variant="secondary">{connection}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <CopyButton value={room.room_code} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
            onClick={() => {
              const nextMuted = !muted;
              setMuted(nextMuted);
              try {
                localStorage.setItem('banko_muted', String(nextMuted));
              } catch {}
            }}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      </div>
      {pendingRequests.length > 0 && (
        <div className="panel flex items-center justify-between gap-3 mb-6">
          <p>
            {pendingRequests.length} payment{' '}
            {pendingRequests.length === 1 ? 'request needs' : 'requests need'}{' '}
            your attention.
          </p>
          <Button variant="secondary" onClick={() => openOperation('requests')}>
            Review
          </Button>
        </div>
      )}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="game-tabs"
      >
        <TabsList>
          <TabsTrigger value="wallet">
            <Wallet /> Wallet
          </TabsTrigger>
          <TabsTrigger value="players">
            <Users /> Players
          </TabsTrigger>
          <TabsTrigger value="activity">
            <Activity /> Activity
          </TabsTrigger>
          {player.is_bank_operator && (
            <TabsTrigger value="bank">
              <Landmark /> Bank
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="wallet">
          <div className="wallet-layout">
            <section>
              <PlayerBalanceCard
                bankName={room.bank_display_name}
                holderName={player.nickname}
                color={player.color}
                balance={player.current_balance}
                roomCode={room.room_code}
                isDefeated={defeated}
                onShowQr={defeated ? undefined : () => openOperation('qr')}
              />
              <div className="wallet-actions">
                <button
                  disabled={defeated}
                  onClick={() => openOperation('send')}
                >
                  <Send size={22} />
                  Send
                </button>
                <button
                  disabled={defeated}
                  onClick={() => openOperation('request')}
                >
                  <ArrowDownLeft size={22} />
                  Request
                </button>
                <button
                  disabled={defeated}
                  onClick={() => openOperation('scan')}
                >
                  <ScanLine size={22} />
                  Scan
                </button>
                <button disabled={defeated} onClick={() => openOperation('qr')}>
                  <QrCode size={22} />
                  My QR
                </button>
              </div>
              {defeated && (
                <p className="error-message mt-4">
                  You are defeated. You can still follow the table.
                </p>
              )}
              <div className="pot-summary">
                <span className="flex items-center gap-2 text-sm">
                  <Trophy size={18} className="text-primary" /> Shared pot
                </span>
                <span className="money">
                  {formatMoney(room.shared_pot_balance)}
                </span>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button
                  variant="ghost"
                  disabled={defeated}
                  onClick={() => openOperation('services')}
                >
                  <Landmark /> Bank services
                </Button>
                <Button
                  variant="ghost"
                  disabled={defeated || pending}
                  onClick={async () => {
                    setPending(true);
                    try {
                      const result = await rollDice(room.id, player.id, 6);
                      toast('Dice rolled', {
                        description:
                          result.roll1 +
                          ' + ' +
                          result.roll2 +
                          ' = ' +
                          result.total,
                      });
                    } catch (failure) {
                      toast.error(
                        failure instanceof Error
                          ? failure.message
                          : 'Dice roll failed',
                      );
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  <Dice5 />
                  {pending ? 'Rolling...' : 'Roll 2d6'}
                </Button>
              </div>
            </section>
            <section>
              <div className="section-heading">
                <h2>Recent activity</h2>
                <Button
                  variant="ghost"
                  onClick={() => setActiveTab('activity')}
                >
                  View all
                </Button>
              </div>
              <ActivityFeed
                transactions={transactions}
                requests={requests}
                events={gameEvents}
                limit={5}
              />
            </section>
          </div>
        </TabsContent>
        <TabsContent value="players">
          <div className="section-heading">
            <h2>Your table</h2>
            <Badge variant="secondary">{players.length} players</Badge>
          </div>
          {players.map((tablePlayer) => (
            <div className="player-row" key={tablePlayer.id}>
              <div className="player-identity">
                <PlayerAvatar player={tablePlayer} />
                <div>
                  <p className="break-words">
                    {tablePlayer.nickname}
                    {tablePlayer.id === player.id ? ' (you)' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tablePlayer.status === 'defeated'
                      ? 'Defeated'
                      : tablePlayer.is_bank_operator
                        ? 'Banker'
                        : 'Player'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <span className="money text-sm">
                  {formatMoney(tablePlayer.current_balance)}
                </span>
                {tablePlayer.id !== player.id &&
                  tablePlayer.status !== 'defeated' &&
                  !defeated && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={'Actions for ' + tablePlayer.nickname}
                        >
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onSelect={() => openOperation('send', tablePlayer.id)}
                        >
                          <Send /> Send money
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            openOperation('request', tablePlayer.id)
                          }
                        >
                          <ArrowDownLeft /> Request money
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="activity">
          <h2 className="mb-4">Table activity</h2>
          <p className="text-sm text-muted-foreground">
            Latest payments, requests and dice rolls.
          </p>
          <ActivityFeed
            transactions={transactions}
            requests={requests}
            events={gameEvents}
          />
        </TabsContent>
        {player.is_bank_operator && (
          <TabsContent value="bank">
            <BankPanel room={room} players={players} />
          </TabsContent>
        )}
      </Tabs>
      <OperationSheet
        open={operation !== null}
        onClose={() => {
          if (!pending) setOperation(null);
        }}
        title={
          operation === 'send'
            ? 'Send money'
            : operation === 'request'
              ? 'Request money'
              : operation === 'qr'
                ? 'Your payment QR'
                : operation === 'scan'
                  ? 'Scan to pay'
                  : operation === 'services'
                    ? 'Bank services'
                    : 'Payment requests'
        }
      >
        {defeated && operation !== 'requests' && (
          <p className="error-message" role="alert">
            You are defeated. Your banker can restore your player status.
          </p>
        )}
        {!defeated && (operation === 'send' || operation === 'request') && (
          <SendMoneyForm
            key={operation + recipientId}
            room={room}
            players={players}
            currentPlayerId={player.id}
            initialRecipientId={recipientId}
            requesting={operation === 'request'}
            onClose={() => setOperation(null)}
            onPendingChange={setPending}
          />
        )}
        {!defeated && operation === 'qr' && (
          <QRRequestForm
            roomCode={room.room_code}
            currentPlayerId={player.id}
          />
        )}
        {!defeated && operation === 'scan' && (
          <ScanQRForm roomCode={room.room_code} />
        )}
        {!defeated && operation === 'services' && (
          <BankServices room={room} player={player} />
        )}
        {operation === 'requests' && (
          <div className="form-stack">
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {pendingRequests.length === 0 && <p>You are all caught up.</p>}
            {pendingRequests.map((request) => (
              <div className="panel form-stack" key={request.id}>
                <p>
                  <strong>{request.from_player.nickname}</strong> requests{' '}
                  <span className="money">{formatMoney(request.amount)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {request.description}
                </p>
                <div className="flex gap-2">
                  {(['rejected', 'accepted'] as const).map((response) => (
                    <Button
                      key={response}
                      variant={
                        response === 'accepted' ? 'default' : 'secondary'
                      }
                      disabled={pending || defeated}
                      onClick={async () => {
                        setPending(true);
                        setError('');
                        try {
                          await respondToPaymentRequest(
                            request.id,
                            response,
                            player.id,
                            room.room_code,
                          );
                          toast.success(
                            response === 'accepted'
                              ? 'Request paid'
                              : 'Request declined',
                          );
                          setRequests((previous) =>
                            previous.map((candidate) =>
                              candidate.id === request.id
                                ? { ...candidate, status: response }
                                : candidate,
                            ),
                          );
                        } catch (failure) {
                          setError(
                            failure instanceof Error
                              ? failure.message
                              : 'Could not process request.',
                          );
                        } finally {
                          setPending(false);
                        }
                      }}
                    >
                      {response === 'accepted'
                        ? 'Pay ' + formatMoney(request.amount)
                        : 'Decline'}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationSheet>
    </AppShell>
  );
}
