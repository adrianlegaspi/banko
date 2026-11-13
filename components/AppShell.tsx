import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
export default function AppShell({
  children,
  back = false,
  roomHeader,
}: {
  children: React.ReactNode;
  back?: boolean;
  roomHeader?: React.ReactNode;
}) {
  return (
    <div className={roomHeader ? "app-shell room-shell" : "app-shell"}>
      <header className="brand-header">
        <Link href="/" className="brand">
          <Image className="brand-symbol" src="/icon.svg" width={44} height={44} alt="" priority />
          banko<span className="brand-period">.</span>
        </Link>
        {roomHeader ?? <span className="eyebrow hidden sm:block">THE GAME NIGHT BANK</span>}
      </header>
      <main>
        {back && (
          <Link href="/" className="back-link">
            <ArrowLeft size={16} /> Back to home
          </Link>
        )}
        {children}
      </main>
      {!roomHeader && <footer className="app-footer">
        Made for the table. Built for the game.
      </footer>}
    </div>
  );
}
