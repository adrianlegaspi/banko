'use client';
import { Landmark } from 'lucide-react';
import type { Player, Room } from '@/app/actions';
import { formatMoney, getPlayerColor } from '@/lib/player-colors';
export function PlayerAvatar({
  player,
}: {
  player: Pick<Player, 'color' | 'nickname'>;
}) {
  const palette = getPlayerColor(player.color);
  return (
    <span
      className="player-avatar"
      style={{ background: palette.background, color: palette.foreground }}
    >
      {player.nickname[0]?.toUpperCase()}
    </span>
  );
}
export default function PlayerSelector({
  players,
  currentPlayerId,
  selectedPlayerId,
  onSelect,
  includeBank = false,
  showDefeated = false,
  room,
}: {
  players: Player[];
  currentPlayerId: string;
  selectedPlayerId: string | null;
  onSelect: (playerId: string | null) => void;
  includeBank?: boolean;
  showDefeated?: boolean;
  room?: Room;
}) {
  return (
    <div className="selector" role="group" aria-label="Choose a player">
      {includeBank && room && (
        <button
          type="button"
          aria-pressed={selectedPlayerId === null}
          className={
            selectedPlayerId === null ? 'border-primary bg-secondary' : ''
          }
          onClick={() => onSelect(null)}
        >
          <Landmark />
          <span>
            {room.bank_display_name}
            <small className="block text-muted-foreground">Bank</small>
          </span>
        </button>
      )}
      {players
        .filter(
          (player) =>
            player.id !== currentPlayerId &&
            (showDefeated || player.status !== 'defeated'),
        )
        .map((player) => (
          <button
            type="button"
            key={player.id}
            aria-pressed={selectedPlayerId === player.id}
            className={
              selectedPlayerId === player.id
                ? 'border-primary bg-secondary'
                : ''
            }
            onClick={() => onSelect(player.id)}
          >
            <PlayerAvatar player={player} />
            <span className="min-w-0 break-words">
              {player.nickname}
              <small className="block text-muted-foreground">
                {formatMoney(player.current_balance)}
                {player.status === 'defeated' ? ' / Defeated' : ''}
              </small>
            </span>
          </button>
        ))}
    </div>
  );
}
