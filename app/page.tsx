import Link from 'next/link';
import { ArrowUpRight, Users, Zap, ShieldCheck } from 'lucide-react';
import AppShell from '@/components/AppShell';
import PlayerBalanceCard from '@/components/game/PlayerBalanceCard';
import { buttonVariants } from '@/components/ui/button';
export default function Home() {
  return (
    <AppShell>
      <div className="home-layout">
        <section className="home-copy">
          <p className="eyebrow text-primary">LESS COUNTING. MORE PLAYING.</p>
          <h1>
            Your game.
            <br />
            Your money.
            <br />
            <span className="text-primary">Your bank.</span>
          </h1>
          <p className="intro">
            All the fun of game night. None of the paper money. Send, request
            and settle up in seconds.
          </p>
          <div className="home-actions">
            <Link
              data-slot="button"
              className={buttonVariants({ size: 'lg' })}
              href="/create"
            >
              Create a room <ArrowUpRight />
            </Link>
            <Link
              data-slot="button"
              className={buttonVariants({ variant: 'secondary', size: 'lg' })}
              href="/join"
            >
              <Users /> Join a room
            </Link>
          </div>
          <div className="home-notes">
            <span>
              <Zap size={16} /> Instant transfers
            </span>
            <span>
              <ShieldCheck size={16} /> No account needed
            </span>
          </div>
        </section>
        <div className="home-card-stage">
          <span className="eyebrow stage-label">YOUR SEAT AT THE TABLE</span>
          <PlayerBalanceCard
            bankName="The Bank"
            holderName="Game night starts here"
            color="green"
            balance={1500}
          />
          <div className="stage-caption">
            <span className="status-light" /> Play money. Real competition.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
