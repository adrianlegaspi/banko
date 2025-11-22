create table public.loans (
  id uuid not null default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  amount numeric not null,
  description text,
  status text not null default 'active', -- 'active', 'paid'
  created_at timestamptz not null default now(),
  primary key (id)
);

-- Enable RLS
alter table public.loans enable row level security;

-- Policies
create policy "Enable read access for all users" on public.loans for select using (true);
create policy "Enable insert for authenticated users only" on public.loans for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users only" on public.loans for update using (auth.role() = 'authenticated');
