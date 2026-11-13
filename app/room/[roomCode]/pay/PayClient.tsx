'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createTransaction, type Room, type Player } from '@/app/actions';
import AppShell from '@/components/AppShell';
import { PlayerAvatar } from '@/components/PlayerSelector';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/player-colors';
export default function PayClient({
  room,
  payer,
  recipient,
  amount,
}: {
  room: Room;
  payer: Player;
  recipient: Player;
  amount: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <AppShell>
      <section className="max-w-md mx-auto panel">
        <p className="eyebrow text-primary">REVIEW BEFORE YOU SEND</p>
        <h1 className="mt-3">Confirm payment.</h1>
        <div className="payment-summary">
          <div className="flex justify-center mb-4">
            <PlayerAvatar player={recipient} />
          </div>
          <p className="text-muted-foreground">Paying {recipient.nickname}</p>
          <p className="money my-4">{formatMoney(amount)}</p>
          <ArrowDown className="mx-auto text-muted-foreground" size={20} />
          <p className="text-sm text-muted-foreground mt-4">
            From {payer.nickname} / {room.bank_display_name}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Available: {formatMoney(payer.current_balance)}
          </p>
        </div>
        {error && (
          <p role="alert" className="error-message mb-4">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => router.push('/room/' + room.room_code + '/game')}
          >
            Cancel
          </Button>
          <Button
            disabled={pending}
            onClick={async () => {
              setPending(true);
              setError('');
              try {
                await createTransaction(
                  room.id,
                  'player_to_player',
                  amount,
                  'QR Payment',
                  payer.id,
                  recipient.id,
                );
                toast.success('Payment sent', {
                  description:
                    formatMoney(amount) + ' to ' + recipient.nickname,
                });
                router.push('/room/' + room.room_code + '/game');
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : 'Payment failed. Please try again.',
                );
                setPending(false);
              }
            }}
          >
            <Check />
            {pending ? 'Sending...' : 'Pay now'}
          </Button>
        </div>
      </section>
    </AppShell>
  );
}
