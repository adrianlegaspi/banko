export type Transaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  from_player_id: string | null;
  to_player_id: string | null;
  from_player?: { nickname: string };
  to_player?: { nickname: string };
  metadata?: { is_reversal?: boolean };
};
export type PaymentRequest = {
  id: string;
  amount: number;
  description: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  from_player_id: string;
  to_player_id: string | null;
  created_at: string;
  from_player: { nickname: string };
};
export type GameEvent = {
  id: string;
  event_type: string;
  created_at: string;
  player_id: string;
  player?: { nickname: string };
  payload: { roll1: number; roll2: number; total: number; sides: number };
};
export type Loan = {
  id: string;
  player_id: string;
  amount: number;
  description: string;
  created_at: string;
  player?: { nickname: string };
};
