'use client';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney } from '@/lib/player-colors';
export default function QRRequestForm({
  roomCode,
  currentPlayerId,
}: {
  roomCode: string;
  currentPlayerId: string;
}) {
  const [amount, setAmount] = useState('');
  const valid = Number.isFinite(Number(amount)) && Number(amount) > 0;
  return (
    <div className="form-stack">
      <div className="field">
        <Label htmlFor="qrAmount">Amount to request</Label>
        <Input
          id="qrAmount"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="0"
        />
      </div>
      <div className="rounded-2xl bg-[oklch(.98_.005_255)] text-[oklch(.2_.01_255)] p-6 min-h-64 grid place-items-center">
        {valid ? (
          <QRCodeSVG
            value={
              window.location.origin +
              '/room/' +
              roomCode +
              '/pay?' +
              new URLSearchParams({ to: currentPlayerId, amount })
            }
            size={200}
            title="Scan to review payment"
          />
        ) : (
          <p className="text-sm text-center">
            Enter an amount to generate your payment QR.
          </p>
        )}
      </div>
      {valid && (
        <p className="text-center text-sm text-muted-foreground">
          Your rival scans, reviews and pays {formatMoney(Number(amount))}.
        </p>
      )}
    </div>
  );
}
