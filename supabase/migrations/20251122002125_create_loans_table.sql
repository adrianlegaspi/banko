create table if not exists public.loans (
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
drop policy if exists "Enable read access for all users" on public.loans;
create policy "Enable read access for all users" on public.loans for select using (true);
drop policy if exists "Enable insert for authenticated users only" on public.loans;
create policy "Enable insert for authenticated users only" on public.loans for insert with check (auth.role() = 'authenticated' or auth.role() = 'anon');
drop policy if exists "Enable update for authenticated users only" on public.loans;
create policy "Enable update for authenticated users only" on public.loans for update using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Grant permissions
grant all on public.loans to postgres, anon, authenticated, service_role;

-- Enable realtime
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loans'
  ) then
    alter publication supabase_realtime add table public.loans;
  end if;
end $$;
