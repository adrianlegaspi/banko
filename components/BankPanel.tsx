'use client';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import {
  Coins,
  ArrowLeftRight,
  Trophy,
  Users,
  Landmark,
  History,
  Flag,
  ArrowRight,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Virtuoso } from 'react-virtuoso';
import {
  createTransaction,
  finishGame,
  updatePlayerStatus,
  createLoan,
  repayLoan,
  getLoans,
  getTransactions,
  revertTransaction,
  type Room,
  type Player,
} from '@/app/actions';
import type { Loan, Transaction } from '@/lib/game-types';
import { formatMoney } from '@/lib/player-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import OperationSheet from '@/components/OperationSheet';
import PlayerSelector from '@/components/PlayerSelector';
type BankOperation =
  'salary' | 'transfer' | 'pot' | 'players' | 'loans' | 'history' | 'end';
const operations = [
  {
    value: 'salary',
    title: 'Pay salary',
    description: 'A little reward for passing Go',
    icon: Coins,
  },
  {
    value: 'transfer',
    title: 'Bank transfers',
    description: 'Give money or collect a payment',
    icon: ArrowLeftRight,
  },
  {
    value: 'pot',
    title: 'Shared pot',
    description: 'Add to the pot or pay it out',
    icon: Trophy,
  },
  {
    value: 'players',
    title: 'Player status',
    description: 'Manage defeated and active players',
    icon: Users,
  },
  {
    value: 'loans',
    title: 'Loans & mortgages',
    description: 'Issue loans and track repayments',
    icon: Landmark,
  },
  {
    value: 'history',
    title: 'Transaction history',
    description: 'Review and reverse transactions',
    icon: History,
  },
] as const;
export default function BankPanel({
  room,
  players,
}: {
  room: Room;
  players: Player[];
}) {
  const [operation, setOperation] = useState<BankOperation | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [direction, setDirection] = useState('give');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [confirmation, setConfirmation] = useState<{
    kind: 'repay' | 'reverse';
    id: string;
    amount: number;
  } | null>(null);
  const selectedPlayer = players.find((player) => player.id === playerId);
  useEffect(() => {
    if (operation !== 'loans' && operation !== 'history') return;
    let active = true;
    async function load() {
      setLoading(true);
      try {
        if (operation === 'loans') {
          const result = await getLoans(room.id);
          if (active) setLoans(result ?? []);
        } else {
          const result = await getTransactions(room.id);
          if (active) setTransactions(result ?? []);
        }
      } catch (failure) {
        if (active)
          setError(
            failure instanceof Error
              ? failure.message
              : 'Could not load records.',
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [operation, room.id]);
  async function execute(action: () => Promise<unknown>, close = true) {
    setPending(true);
    setError('');
    try {
      await action();
      toast.success('Bank updated');
      if (close) setOperation(null);
    } catch (failure) {
      if (failure instanceof Error && failure.message === 'NEXT_REDIRECT')
        throw failure;
      setError(
        failure instanceof Error
          ? failure.message
          : 'Operation failed. Try again.',
      );
    } finally {
      setPending(false);
    }
  }
  async function submit() {
    if (!operation) return;
    if (operation === 'end') {
      await execute(() => finishGame(room.room_code));
      return;
    }
    if (!playerId) {
      setError('Choose a player first.');
      return;
    }
    if (operation === 'players') {
      await execute(() =>
        updatePlayerStatus(
          playerId,
          selectedPlayer?.status === 'defeated' ? 'active' : 'defeated',
          room.room_code,
        ),
      );
      return;
    }
    if (
      operation !== 'salary' &&
      (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
    ) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (operation === 'loans') {
      await execute(() =>
        createLoan(room.id, playerId, Number(amount), description || 'Loan'),
      );
      return;
    }
    const transactionType =
      operation === 'salary'
        ? 'bank_to_player'
        : operation === 'pot'
          ? direction === 'give'
            ? 'pot_out'
            : 'pot_in'
          : direction === 'give'
            ? 'bank_to_player'
            : 'player_to_bank';
    const outgoing =
      transactionType === 'player_to_bank' || transactionType === 'pot_in';
    await execute(() =>
      createTransaction(
        room.id,
        transactionType,
        operation === 'salary' ? room.salary_amount : Number(amount),
        operation === 'salary'
          ? 'Salary'
          : operation === 'pot'
            ? outgoing
              ? 'Added to Pot'
              : 'Collected from Pot'
            : 'Bank Transfer',
        outgoing ? playerId : undefined,
        outgoing ? undefined : playerId,
      ),
    );
  }
  return (
    <section>
      <div className="section-heading">
        <div>
          <h2>{room.bank_display_name}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your table. Your banker controls.
          </p>
        </div>
        <span className="money text-primary">
          Pot {formatMoney(room.shared_pot_balance)}
        </span>
      </div>
      <div className="bank-tools">
        {operations.map((bankOperation) => (
          <button
            type="button"
            className="bank-tool"
            key={bankOperation.value}
            onClick={() => {
              setOperation(bankOperation.value);
              setPlayerId(null);
              setAmount('');
              setDescription('');
              setDirection('give');
              setError('');
              setConfirmation(null);
            }}
          >
            <bankOperation.icon size={24} />
            <span>
              <strong className="block">{bankOperation.title}</strong>
              <span className="block text-sm text-muted-foreground mt-1">
                {bankOperation.description}
              </span>
            </span>
            <ArrowRight className="ml-auto" size={18} />
          </button>
        ))}
      </div>
      <Button
        variant="ghost"
        className="mt-6 text-destructive"
        onClick={() => {
          setOperation('end');
          setError('');
        }}
      >
        <Flag /> End game
      </Button>
      <OperationSheet
        open={operation !== null}
        onClose={() => {
          if (!pending) setOperation(null);
        }}
        title={
          operation === 'end'
            ? 'End this game?'
            : (operations.find(
                (bankOperation) => bankOperation.value === operation,
              )?.title ?? 'Bank')
        }
      >
        <div className="form-stack">
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          {operation === 'history' && (
            <>
              <p className="text-sm text-muted-foreground">
                All room transactions. Reversals create a new reversing
                transaction.
              </p>
              {loading ? (
                <Skeleton
                  className="h-24 w-full"
                  role="status"
                  aria-label="Loading history"
                />
              ) : transactions.length === 0 ? (
                <p>No transactions yet.</p>
              ) : (
                <Virtuoso
                  style={{ height: '55svh' }}
                  data={transactions}
                  itemContent={(_index, transaction) => (
                    <div className="activity-row">
                      <div className="min-w-0">
                        <p className="text-sm">
                          {players.find(
                            (player) =>
                              player.id === transaction.from_player_id,
                          )?.nickname ?? room.bank_display_name}{' '}
                          to{' '}
                          {players.find(
                            (player) => player.id === transaction.to_player_id,
                          )?.nickname ?? room.bank_display_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {transaction.description}
                        </p>
                        <time
                          className="text-xs text-muted-foreground"
                          dateTime={transaction.created_at}
                        >
                          {new Date(transaction.created_at).toLocaleString()}
                        </time>
                      </div>
                      <span className="money text-sm">
                        {formatMoney(transaction.amount)}
                      </span>
                      {transaction.type !== 'reversal' &&
                        !transaction.metadata?.is_reversal && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Reverse transaction"
                            disabled={pending}
                            onClick={() =>
                              setConfirmation({
                                kind: 'reverse',
                                id: transaction.id,
                                amount: transaction.amount,
                              })
                            }
                          >
                            <Undo2 />
                          </Button>
                        )}
                    </div>
                  )}
                />
              )}
            </>
          )}
          {operation === 'loans' && (
            <>
              <h3>Active loans</h3>
              {loading ? (
                <Skeleton
                  className="h-24 w-full"
                  role="status"
                  aria-label="Loading loans"
                />
              ) : loans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active loans at this table.
                </p>
              ) : (
                loans.map((loan) => (
                  <div className="activity-row" key={loan.id}>
                    <div>
                      <p>{loan.player?.nickname}</p>
                      <p className="text-sm text-muted-foreground">
                        {loan.description}
                      </p>
                      <span className="money">{formatMoney(loan.amount)}</span>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={pending}
                      onClick={() =>
                        setConfirmation({
                          kind: 'repay',
                          id: loan.id,
                          amount: loan.amount,
                        })
                      }
                    >
                      Repay full
                    </Button>
                  </div>
                ))
              )}
              <h3 className="mt-4">Issue a loan</h3>
            </>
          )}
          {confirmation && (
            <div className="panel form-stack">
              <p>
                {confirmation.kind === 'repay'
                  ? 'Repay loan of '
                  : 'Reverse transaction of '}
                {formatMoney(confirmation.amount)}?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => setConfirmation(null)}
                >
                  Cancel
                </Button>
                <Button
                  disabled={pending}
                  onClick={() =>
                    execute(async () => {
                      if (confirmation.kind === 'repay') {
                        await repayLoan(
                          confirmation.id,
                          confirmation.amount,
                          room.id,
                        );
                        setLoans((await getLoans(room.id)) ?? []);
                      } else {
                        await revertTransaction(
                          confirmation.id,
                          room.room_code,
                        );
                        setTransactions((await getTransactions(room.id)) ?? []);
                      }
                      setConfirmation(null);
                    }, false)
                  }
                >
                  {pending ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          )}
          {operation !== 'history' && (
            <form
              className="form-stack"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <fieldset disabled={pending} className="form-stack">
                {operation === 'end' ? (
                  <p>
                    Final standings will be published for everyone. This game
                    cannot be restarted.
                  </p>
                ) : (
                  <>
                    {(operation === 'transfer' || operation === 'pot') && (
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={
                            direction === 'give' ? 'default' : 'secondary'
                          }
                          onClick={() => setDirection('give')}
                        >
                          {operation === 'pot' ? 'Pot to player' : 'Give money'}
                        </Button>
                        <Button
                          type="button"
                          variant={
                            direction === 'collect' ? 'default' : 'secondary'
                          }
                          onClick={() => setDirection('collect')}
                        >
                          {operation === 'pot'
                            ? 'Player to pot'
                            : 'Collect money'}
                        </Button>
                      </div>
                    )}
                    {operation === 'pot' && (
                      <p className="text-sm text-muted-foreground">
                        Current pot: {formatMoney(room.shared_pot_balance)}
                      </p>
                    )}
                    <PlayerSelector
                      players={players}
                      currentPlayerId="bank"
                      selectedPlayerId={playerId}
                      onSelect={setPlayerId}
                      showDefeated={operation === 'players'}
                      room={room}
                    />
                    {operation === 'salary' && (
                      <p className="text-sm">
                        Pay {formatMoney(room.salary_amount)} to{' '}
                        {selectedPlayer?.nickname ?? 'your selected player'}.
                      </p>
                    )}
                    {operation === 'players' && selectedPlayer && (
                      <p>Current status: {selectedPlayer.status}</p>
                    )}
                    {operation !== 'salary' && operation !== 'players' && (
                      <div className="field">
                        <Label htmlFor="bankAmount">Amount</Label>
                        <Input
                          id="bankAmount"
                          type="number"
                          inputMode="decimal"
                          min="0.01"
                          step="0.01"
                          required
                          value={amount}
                          onChange={(event) => setAmount(event.target.value)}
                        />
                        {operation === 'pot' && (
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={direction === 'collect' && !playerId}
                            onClick={() =>
                              setAmount(
                                String(
                                  direction === 'give'
                                    ? room.shared_pot_balance
                                    : (selectedPlayer?.current_balance ?? 0),
                                ),
                              )
                            }
                          >
                            {direction === 'give'
                              ? 'Pay entire pot'
                              : 'Use player balance'}
                          </Button>
                        )}
                      </div>
                    )}
                    {operation === 'loans' && (
                      <div className="field">
                        <Label htmlFor="loanDescription">Description</Label>
                        <Input
                          id="loanDescription"
                          value={description}
                          onChange={(event) =>
                            setDescription(event.target.value)
                          }
                          placeholder="Mortgage for Boardwalk"
                        />
                      </div>
                    )}
                  </>
                )}
                <Button
                  type="submit"
                  variant={operation === 'end' ? 'destructive' : 'default'}
                  disabled={pending || (operation !== 'end' && !playerId)}
                >
                  {pending
                    ? 'Processing...'
                    : operation === 'end'
                      ? 'End game and show standings'
                      : operation === 'players'
                        ? selectedPlayer?.status === 'defeated'
                          ? 'Restore player'
                          : 'Mark as defeated'
                        : operation === 'loans'
                          ? 'Issue loan'
                          : 'Confirm payment'}
                </Button>
              </fieldset>
            </form>
          )}
        </div>
      </OperationSheet>
    </section>
  );
}
