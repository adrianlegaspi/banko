import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
export default function AppShell({
  children,
  back = false,
}: {
  children: React.ReactNode;
  back?: boolean;
}) {
  return (
    <div className="app-shell">
      <header className="brand-header">
        <Link href="/" className="brand">
          <Image className="brand-symbol" src="/icon.svg" width={44} height={44} alt="" priority />
          banko<span className="brand-period">.</span>
        </Link>
        <span className="eyebrow hidden sm:block">THE GAME NIGHT BANK</span>
      </header>
      <main>
        {back && (
          <Link href="/" className="back-link">
            <ArrowLeft size={16} /> Back to home
          </Link>
        )}
        {children}
      </main>
      <footer className="app-footer">
        Made for the table. Built for the game.
      </footer>
    </div>
  );
}
