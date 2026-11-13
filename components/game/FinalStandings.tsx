import type { Room, Player } from '@/app/actions';
import Link from 'next/link';
import { Trophy, ArrowUpRight } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { PlayerAvatar } from '@/components/PlayerSelector';
import { buttonVariants } from '@/components/ui/button';
import { formatMoney } from '@/lib/player-colors';
export default function FinalStandings({
  room,
  players,
}: {
  room: Room;
  players: Player[];
}) {
  const standings = [...players].sort(
    (first, second) => second.current_balance - first.current_balance,
  );
  return (
    <AppShell>
      <section className="max-w-2xl mx-auto">
        <Trophy className="text-primary mb-6" size={48} />
        <p className="eyebrow text-primary">THAT IS A WRAP</p>
        <h1 className="mt-3">
          {standings[0]?.nickname ?? 'Your table'} takes the crown.
        </h1>
        <p className="intro">{room.room_name} / Final standings</p>
        <div className="mt-8">
          {standings.map((player, index) => (
            <div className="player-row" key={player.id}>
              <div className="player-identity">
                <span
                  className={
                    index === 0
                      ? 'text-primary font-bold'
                      : 'text-muted-foreground'
                  }
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <PlayerAvatar player={player} />
                <div>
                  <p>{player.nickname}</p>
                  {player.is_bank_operator && (
                    <p className="text-xs text-muted-foreground">Banker</p>
                  )}
                </div>
              </div>
              <span className="money">
                {formatMoney(player.current_balance)}
              </span>
            </div>
          ))}
        </div>
        <Link
          data-slot="button"
          href="/"
          className={buttonVariants({ className: 'mt-8', size: 'lg' })}
        >
          Back to home <ArrowUpRight />
        </Link>
      </section>
    </AppShell>
  );
}
