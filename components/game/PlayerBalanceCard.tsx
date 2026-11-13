import { QrCode, Landmark } from 'lucide-react';
import { getPlayerColor, formatMoney } from '@/lib/player-colors';
export default function PlayerBalanceCard({
  bankName,
  holderName,
  color,
  balance,
  roomCode,
  isDefeated = false,
  onShowQr,
}: {
  bankName: string;
  holderName: string;
  color: string;
  balance: number;
  roomCode?: string;
  isDefeated?: boolean;
  onShowQr?: () => void;
}) {
  const palette = getPlayerColor(color);
  return (
    <section
      className="bank-card"
      aria-label={(holderName || 'Your') + ' bank card'}
      style={{ background: palette.background, color: palette.foreground }}
    >
      <div className="card-circle card-circle-top" aria-hidden="true" />
      <div className="card-circle card-circle-bottom" aria-hidden="true" />
      <div className="card-top">
        <div>
          <p className="card-bank" title={bankName || 'The Bank'}>{bankName || 'The Bank'}</p>
          <p className="card-caption">GAME NIGHT DEBIT</p>
        </div>
        {onShowQr ? (
          <button
            className="card-qr"
            onClick={onShowQr}
            aria-label="Show payment QR"
          >
            <QrCode />
          </button>
        ) : (
          <Landmark size={28} />
        )}
      </div>
      <div className="card-balance">
        <p className="card-caption">Available balance</p>
        <p className="balance-number">{formatMoney(balance)}</p>
      </div>
      <div className="card-bottom">
        <div>
          <p className="card-caption">Card holder</p>
          <p className="card-holder" title={holderName || 'Your name here'}>
            {holderName || 'Your name here'}
            {isDefeated && <span className="ml-2 text-sm">(Defeated)</span>}
          </p>
        </div>
        <span className="card-code">**** {roomCode || 'BANKO'}</span>
      </div>
    </section>
  );
}
