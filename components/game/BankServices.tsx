'use client';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import {
  createTransaction,
  getLoans,
  repayLoan,
  type Room,
  type Player,
} from '@/app/actions';
import type { Loan } from '@/lib/game-types';
import { formatMoney } from '@/lib/player-colors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
export default function BankServices({
  room,
  player,
}: {
  room: Room;
  player: Player;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [repayment, setRepayment] = useState<Loan | null>(null);
  const [propertyType, setPropertyType] = useState('property');
  const [propertyName, setPropertyName] = useState('');
  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState<{ name: string; amount: number }[]>(
    [],
  );
  useEffect(() => {
    let active = true;
    getLoans(room.id)
      .then((records) => {
        if (active)
          setLoans(
            (records ?? []).filter((loan) => loan.player_id === player.id),
          );
      })
      .catch(() => {
        if (active)
          setError('Could not load loans. Reopen bank services to retry.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [room.id, player.id]);
  return (
    <div className="form-stack">
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <h3>My loans</h3>
      {loading ? (
        <Skeleton
          className="h-24 w-full"
          role="status"
          aria-label="Loading loans"
        />
      ) : loans.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No active loans. Your banker can issue a loan if you need one.
        </p>
      ) : (
        loans.map((loan) => (
          <div key={loan.id} className="activity-row">
            <div>
              <p>{loan.description}</p>
              <span className="money">{formatMoney(loan.amount)}</span>
            </div>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setRepayment(loan)}
            >
              Repay full
            </Button>
          </div>
        ))
      )}
      {repayment && (
        <div className="panel form-stack">
          <p>Repay {formatMoney(repayment.amount)} from your balance?</p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setRepayment(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={async () => {
                setPending(true);
                setError('');
                try {
                  await repayLoan(repayment.id, repayment.amount, room.id);
                  setLoans(
                    ((await getLoans(room.id)) ?? []).filter(
                      (loan) => loan.player_id === player.id,
                    ),
                  );
                  setRepayment(null);
                  toast.success('Loan repaid');
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : 'Repayment failed.',
                  );
                } finally {
                  setPending(false);
                }
              }}
            >
              Confirm repayment
            </Button>
          </div>
        </div>
      )}
      <h3 className="mt-4">Property purchases</h3>
      <form
        className="form-stack"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError('');
          try {
            const numericAmount = Number(amount);
            if (!Number.isFinite(numericAmount) || numericAmount <= 0)
              throw new Error('Enter a valid amount.');
            const purchaseDescription =
              'Bought ' +
              (propertyType === 'property'
                ? 'Property: '
                : propertyType === 'house'
                  ? 'House on '
                  : 'Hotel on ') +
              propertyName;
            await createTransaction(
              room.id,
              'player_to_bank',
              numericAmount,
              purchaseDescription,
              player.id,
            );
            setHistory((previous) => [
              { name: purchaseDescription, amount: numericAmount },
              ...previous,
            ]);
            setPropertyName('');
            setAmount('');
            toast.success('Purchase paid');
          } catch (failure) {
            setError(
              failure instanceof Error ? failure.message : 'Payment failed.',
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <fieldset disabled={pending} className="form-stack">
          <div className="field">
            <Label htmlFor="propertyType">Purchase type</Label>
            <select
              id="propertyType"
              className="p-3"
              value={propertyType}
              onChange={(event) => setPropertyType(event.target.value)}
            >
              <option value="property">Property</option>
              <option value="house">House</option>
              <option value="hotel">Hotel</option>
            </select>
          </div>
          <div className="field">
            <Label htmlFor="propertyName">Property name</Label>
            <Input
              id="propertyName"
              required
              value={propertyName}
              onChange={(event) => setPropertyName(event.target.value)}
              placeholder="Boardwalk"
            />
          </div>
          <div className="field">
            <Label htmlFor="propertyAmount">Amount</Label>
            <Input
              id="propertyAmount"
              required
              type="number"
              min="0.01"
              step="0.01"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending
              ? 'Processing...'
              : 'Pay ' + formatMoney(Number(amount) || 0)}
          </Button>
        </fieldset>
      </form>
      {history.length > 0 && (
        <>
          <h3>Recent purchases</h3>
          {history.map((purchase, index) => (
            <div className="activity-row" key={index}>
              <span>{purchase.name}</span>
              <span className="money">{formatMoney(purchase.amount)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
