import { ArrowLeftRight, Dice5, Check, X } from 'lucide-react';
import type { Transaction, PaymentRequest, GameEvent } from '@/lib/game-types';
import { formatMoney } from '@/lib/player-colors';
export default function ActivityFeed({
  transactions,
  requests,
  events,
  limit = 50,
}: {
  transactions: Transaction[];
  requests: PaymentRequest[];
  events: GameEvent[];
  limit?: number;
}) {
  const activities = [
    ...transactions.map((transaction) => ({
      id: 'transaction-' + transaction.id,
      createdAt: transaction.created_at,
      title:
        (transaction.from_player?.nickname ?? 'Bank') +
        ' to ' +
        (transaction.to_player?.nickname ?? 'Bank'),
      description: transaction.description,
      amount: formatMoney(transaction.amount),
      icon: ArrowLeftRight,
    })),
    ...requests
      .filter((request) => request.status !== 'pending')
      .map((request) => ({
        id: 'request-' + request.id,
        createdAt: request.created_at,
        title: request.from_player.nickname + ': request ' + request.status,
        description: request.description,
        amount: formatMoney(request.amount),
        icon: request.status === 'accepted' ? Check : X,
      })),
    ...events
      .filter((gameEvent) => gameEvent.event_type === 'dice_roll')
      .map((gameEvent) => ({
        id: 'event-' + gameEvent.id,
        createdAt: gameEvent.created_at,
        title: (gameEvent.player?.nickname ?? 'Player') + ' rolled dice',
        description: gameEvent.payload.roll1 + ' + ' + gameEvent.payload.roll2,
        amount: String(gameEvent.payload.total),
        icon: Dice5,
      })),
  ]
    .sort(
      (first, second) =>
        new Date(second.createdAt).getTime() -
        new Date(first.createdAt).getTime(),
    )
    .slice(0, limit);
  return activities.length === 0 ? (
    <div className="py-10 text-sm text-muted-foreground">
      <ArrowLeftRight className="mb-4 text-primary" />
      <p>Your first deal starts the story.</p>
      <p className="mt-1">Payments and dice rolls will appear here.</p>
    </div>
  ) : (
    <div>
      {activities.map((activity) => (
        <div className="activity-row" key={activity.id}>
          <activity.icon size={18} className="text-muted-foreground shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium break-words">{activity.title}</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">
              {activity.description}
            </p>
            <time
              className="text-xs text-muted-foreground"
              dateTime={activity.createdAt}
            >
              {new Date(activity.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </div>
          <span className="money text-sm">{activity.amount}</span>
        </div>
      ))}
    </div>
  );
}
