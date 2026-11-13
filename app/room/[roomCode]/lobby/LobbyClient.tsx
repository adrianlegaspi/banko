'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Users, Crown, Link as LinkIcon } from 'lucide-react';
import type { Player, Room } from '@/app/actions';
import { startGame } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppShell from '@/components/AppShell';
import CopyButton from '@/components/CopyButton';
import { PlayerAvatar } from '@/components/PlayerSelector';
import { formatMoney } from '@/lib/player-colors';
export default function LobbyClient({
  room,
  currentPlayer,
  players: initialPlayers,
}: {
  room: Room;
  currentPlayer: Player;
  players: Player[];
}) {
  const [players, setPlayers] = useState(initialPlayers);
  const [connection, setConnection] = useState('Connecting');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [origin, setOrigin] = useState('');
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  useEffect(() => {
    queueMicrotask(() => setOrigin(window.location.origin));
    async function refreshPlayers() {
      const { data: refreshedPlayers } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id);
      if (refreshedPlayers) setPlayers(refreshedPlayers);
    }
    const channel = supabase
      .channel('lobby-' + room.id)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: 'room_id=eq.' + room.id,
        },
        refreshPlayers,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: 'id=eq.' + room.id,
        },
        (payload) => {
          if (payload.new.status === 'in_progress')
            router.push('/room/' + room.room_code + '/game');
        },
      )
      .subscribe((status) => {
        setConnection(status === 'SUBSCRIBED' ? 'Live' : 'Reconnecting');
        if (status === 'SUBSCRIBED') {
          void refreshPlayers();
          router.refresh();
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, room.id, room.room_code, router]);
  return (
    <AppShell>
      <div className="page-heading">
        <div>
          <p className="eyebrow text-primary">THE TABLE IS OPEN</p>
          <h1 className="mt-3">{room.room_name}</h1>
          <p className="intro">
            Invite your rivals. Pick your seats. Get ready to play.
          </p>
        </div>
        <Badge variant="secondary">{connection}</Badge>
      </div>
      <div className="wallet-layout">
        <section className="panel">
          <div className="section-heading">
            <h2>Invite your table</h2>
            <LinkIcon size={20} className="text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Room code</p>
          <p className="room-code my-4 select-all">{room.room_code}</p>
          <div className="flex gap-3 flex-wrap">
            <CopyButton value={room.room_code} />
            {origin && (
              <CopyButton
                value={origin + '/join?code=' + room.room_code}
                label="Copy invite link"
              />
            )}
          </div>
          <dl className="summary-grid">
            <div>
              <dt>Starting balance</dt>
              <dd>{formatMoney(room.initial_player_balance)}</dd>
            </div>
            <div>
              <dt>Pass Go salary</dt>
              <dd>{formatMoney(room.salary_amount)}</dd>
            </div>
            <div>
              <dt>Your bank</dt>
              <dd>{room.bank_display_name}</dd>
            </div>
          </dl>
        </section>
        <section>
          <div className="section-heading">
            <h2 className="flex gap-2 items-center">
              <Users size={20} /> Players
            </h2>
            <Badge variant="secondary">{players.length} at the table</Badge>
          </div>
          {players.map((player) => (
            <div className="player-row" key={player.id}>
              <div className="player-identity">
                <PlayerAvatar player={player} />
                <span>
                  {player.nickname}
                  {player.id === currentPlayer.id && (
                    <small className="block text-muted-foreground">You</small>
                  )}
                </span>
              </div>
              {player.is_bank_operator && (
                <Badge variant="secondary">
                  <Crown size={14} /> Banker
                </Badge>
              )}
            </div>
          ))}
          <div className="mt-6 form-stack">
            {currentPlayer.is_bank_operator ? (
              <>
                <Button
                  disabled={pending || players.length < 2}
                  size="lg"
                  onClick={() =>
                    startTransition(async () => {
                      setError('');
                      try {
                        await startGame(room.room_code);
                      } catch (failure) {
                        if (
                          failure instanceof Error &&
                          failure.message === 'NEXT_REDIRECT'
                        )
                          throw failure;
                        setError(
                          failure instanceof Error
                            ? failure.message
                            : 'Could not start. Try again.',
                        );
                      }
                    })
                  }
                >
                  {pending ? 'Starting game...' : 'Start game'}
                  <ArrowRight />
                </Button>
                {players.length < 2 && (
                  <p className="text-sm text-muted-foreground">
                    Invite one more player to start.
                  </p>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">
                Waiting for your banker to start the game.
              </p>
            )}
            {error && (
              <p role="alert" className="error-message">
                {error}
              </p>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
