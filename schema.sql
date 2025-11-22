-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ROOMS
create table rooms (
  id uuid primary key default uuid_generate_v4(),
  room_code text unique not null,
  room_name text not null,
  initial_player_balance numeric not null default 0,
  bank_display_name text not null default 'Bank',
  status text not null default 'lobby' check (status in ('lobby', 'in_progress', 'finished')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- PLAYERS
create table players (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  supabase_user_id uuid not null, -- Anonymous auth user id
  nickname text not null,
  color text not null,
  current_balance numeric not null default 0,
  is_bank_operator boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- TRANSACTIONS
create table transactions (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  from_player_id uuid references players(id) on delete set null,
  to_player_id uuid references players(id) on delete set null,
  amount numeric not null check (amount >= 0),
  type text not null check (type in ('bank_to_player', 'player_to_bank', 'player_to_player', 'pot_in', 'pot_out', 'reversal')),
  description text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- PAYMENT REQUESTS
create table payment_requests (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  from_player_id uuid references players(id) on delete cascade not null, -- Requestor
  to_player_id uuid references players(id) on delete cascade, -- Payer (nullable for QR initially, but usually specified)
  amount numeric not null check (amount > 0),
  description text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- INDEXES
create index idx_rooms_code on rooms(room_code);
create index idx_players_room_user on players(room_id, supabase_user_id);
create index idx_transactions_room on transactions(room_id);
create index idx_payment_requests_room on payment_requests(room_id);

-- RLS POLICIES (Enable RLS but allow public access for MVP simplicity if needed, or restrictive)
-- For this MVP, since we use Service Role for all mutations, we can keep RLS simple or just enable read for everyone in the room.
-- However, Realtime requires RLS to be enabled and policies to be set for clients to subscribe to changes.

alter table rooms enable row level security;
alter table players enable row level security;
alter table transactions enable row level security;
alter table payment_requests enable row level security;

-- Allow anyone to read everything (simplification for MVP, assuming room codes are secret enough)
create policy "Public read access" on rooms for select using (true);
create policy "Public read access" on players for select using (true);
create policy "Public read access" on transactions for select using (true);
create policy "Public read access" on payment_requests for select using (true);

-- Allow insert/update only via Service Role (which bypasses RLS)
-- But for Realtime to work, we need policies.
-- We will rely on the backend for all writes.

-- REALTIME SETUP
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table rooms, players, transactions, payment_requests;
commit;
