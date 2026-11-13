'use client';
import { useState } from 'react';
import {
  createTransaction,
  createPaymentRequest,
  type Player,
  type Room,
} from '@/app/actions';
import PlayerSelector from '@/components/PlayerSelector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/player-colors';
import { toast } from 'sonner';
export default function SendMoneyForm({
  room,
  players,
  currentPlayerId,
  initialRecipientId = null,
  requesting = false,
  onClose,
  onPendingChange,
}: {
  room: Room;
  players: Player[];
  currentPlayerId: string;
  initialRecipientId?: string | null;
  requesting?: boolean;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [recipientId, setRecipientId] = useState<string | null>(
    initialRecipientId,
  );
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const recipientName =
    players.find((player) => player.id === recipientId)?.nickname ??
    room.bank_display_name;
  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        onPendingChange?.(true);
        setError('');
        try {
          if (!Number.isFinite(Number(amount)) || Number(amount) <= 0)
            throw new Error('Enter an amount greater than zero.');
          if (requesting) {
            if (!recipientId) throw new Error('Choose a player.');
            await createPaymentRequest(
              room.id,
              currentPlayerId,
              Number(amount),
              description || 'Payment Request',
              recipientId,
            );
          } else {
            await createTransaction(
              room.id,
              recipientId ? 'player_to_player' : 'player_to_bank',
              Number(amount),
              description || 'Payment',
              currentPlayerId,
              recipientId ?? undefined,
            );
          }
          toast.success(requesting ? 'Request sent' : 'Payment sent', {
            description:
              formatMoney(Number(amount)) +
              (requesting ? ' requested from ' : ' sent to ') +
              recipientName,
          });
          onClose();
        } catch (failure) {
          setError(
            failure instanceof Error ? failure.message : 'Please try again.',
          );
        } finally {
          setPending(false);
          onPendingChange?.(false);
        }
      }}
    >
      <fieldset disabled={pending} className="form-stack">
        <div>
          <p className="field-label">
            {requesting ? 'Request from' : 'Send to'}
          </p>
          <PlayerSelector
            players={players}
            currentPlayerId={currentPlayerId}
            selectedPlayerId={recipientId}
            onSelect={setRecipientId}
            includeBank={!requesting}
            room={room}
          />
        </div>
        <div className="field">
          <Label htmlFor="transferAmount">Amount</Label>
          <Input
            id="transferAmount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            required
          />
        </div>
        <div className="field">
          <Label htmlFor="transferNote">Note (optional)</Label>
          <Textarea
            id="transferNote"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Rent, a deal, a little friendly rivalry..."
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {requesting ? 'Requesting from ' : 'Paying '}
          {recipientName}.{' '}
          {requesting
            ? ''
            : 'Your balance: ' +
              formatMoney(
                players.find((player) => player.id === currentPlayerId)
                  ?.current_balance ?? 0,
              )}
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={pending || (requesting && !recipientId)}
        >
          {pending
            ? 'Processing...'
            : (requesting ? 'Request ' : 'Send ') +
              formatMoney(Number(amount) || 0)}
        </Button>
      </fieldset>
    </form>
  );
}
