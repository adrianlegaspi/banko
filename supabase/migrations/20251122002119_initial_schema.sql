-- ROOMS
create table rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  room_name text not null,
  initial_player_balance numeric not null default 0,
  bank_display_name text not null default 'Bank',
  status text not null default 'lobby' check (status in ('lobby', 'in_progress', 'finished')),
  shared_pot_balance numeric not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- PLAYERS
create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  supabase_user_id uuid not null,
  nickname text not null,
  color text not null,
  current_balance numeric not null default 0,
  is_bank_operator boolean not null default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- TRANSACTIONS
create table transactions (
  id uuid primary key default gen_random_uuid(),
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
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  from_player_id uuid references players(id) on delete cascade not null,
  to_player_id uuid references players(id) on delete cascade,
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

-- RLS POLICIES
alter table rooms enable row level security;
alter table players enable row level security;
alter table transactions enable row level security;
alter table payment_requests enable row level security;

-- Allow anyone to read everything (simplification for MVP)
-- Allow anyone to read everything (simplification for MVP)
create policy "Public read access" on rooms for select using (true);
create policy "Public read access" on players for select using (true);
create policy "Public read access" on transactions for select using (true);
create policy "Public read access" on payment_requests for select using (true);

-- Allow authenticated users (including anon) to insert and update
create policy "Public insert access" on rooms for insert with check (auth.role() = 'anon' or auth.role() = 'authenticated');
create policy "Public update access" on rooms for update using (auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Public insert access" on players for insert with check (auth.role() = 'anon' or auth.role() = 'authenticated');
create policy "Public update access" on players for update using (auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Public insert access" on transactions for insert with check (auth.role() = 'anon' or auth.role() = 'authenticated');
create policy "Public update access" on transactions for update using (auth.role() = 'anon' or auth.role() = 'authenticated');

create policy "Public insert access" on payment_requests for insert with check (auth.role() = 'anon' or auth.role() = 'authenticated');
create policy "Public update access" on payment_requests for update using (auth.role() = 'anon' or auth.role() = 'authenticated');

-- REALTIME SETUP
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table rooms, players, transactions, payment_requests;
commit;

-- RPC: perform_transaction
-- Handles money movement atomically
create or replace function perform_transaction(
  p_room_id uuid,
  p_from_player_id uuid,
  p_to_player_id uuid,
  p_amount numeric,
  p_type text,
  p_description text
) returns jsonb as $$
declare
  v_transaction_id uuid;
begin
  -- 1. Insert Transaction
  insert into transactions (room_id, from_player_id, to_player_id, amount, type, description)
  values (p_room_id, p_from_player_id, p_to_player_id, p_amount, p_type, p_description)
  returning id into v_transaction_id;

  -- 2. Update Balances based on Type
  
  -- PLAYER TO PLAYER
  if p_type = 'player_to_player' then
    update players set current_balance = current_balance - p_amount where id = p_from_player_id;
    update players set current_balance = current_balance + p_amount where id = p_to_player_id;
  end if;

  -- BANK TO PLAYER
  if p_type = 'bank_to_player' then
    update players set current_balance = current_balance + p_amount where id = p_to_player_id;
  end if;

  -- PLAYER TO BANK
  if p_type = 'player_to_bank' then
    update players set current_balance = current_balance - p_amount where id = p_from_player_id;
  end if;
  
  -- POT IN (Player -> Pot)
  if p_type = 'pot_in' then
    update players set current_balance = current_balance - p_amount where id = p_from_player_id;
    update rooms set shared_pot_balance = shared_pot_balance + p_amount where id = p_room_id;
  end if;

  -- POT OUT (Pot -> Player)
  if p_type = 'pot_out' then
    update rooms set shared_pot_balance = shared_pot_balance - p_amount where id = p_room_id;
    update players set current_balance = current_balance + p_amount where id = p_to_player_id;
  end if;
  
  -- REVERSAL - Generic reversal logic
  if p_type = 'reversal' then
     if p_from_player_id is not null then
       update players set current_balance = current_balance - p_amount where id = p_from_player_id;
     end if;
     
     if p_to_player_id is not null then
       update players set current_balance = current_balance + p_amount where id = p_to_player_id;
     end if;
  end if;

  return jsonb_build_object('id', v_transaction_id);
end;
$$ language plpgsql;

