-- Drop existing policies to ensure clean slate
drop policy if exists "Public read access" on rooms;
drop policy if exists "Public insert access" on rooms;
drop policy if exists "Public update access" on rooms;

drop policy if exists "Public read access" on players;
drop policy if exists "Public insert access" on players;
drop policy if exists "Public update access" on players;

drop policy if exists "Public read access" on transactions;
drop policy if exists "Public insert access" on transactions;
drop policy if exists "Public update access" on transactions;

drop policy if exists "Public read access" on payment_requests;
drop policy if exists "Public insert access" on payment_requests;
drop policy if exists "Public update access" on payment_requests;

-- Re-create policies allowing full access for authenticated users (including our guest users)

-- ROOMS
create policy "Enable read access for all users" on rooms for select using (true);
create policy "Enable insert for authenticated users" on rooms for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on rooms for update using (auth.role() = 'authenticated');

-- PLAYERS
create policy "Enable read access for all users" on players for select using (true);
create policy "Enable insert for authenticated users" on players for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on players for update using (auth.role() = 'authenticated');

-- TRANSACTIONS
create policy "Enable read access for all users" on transactions for select using (true);
create policy "Enable insert for authenticated users" on transactions for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on transactions for update using (auth.role() = 'authenticated');

-- PAYMENT REQUESTS
create policy "Enable read access for all users" on payment_requests for select using (true);
create policy "Enable insert for authenticated users" on payment_requests for insert with check (auth.role() = 'authenticated');
create policy "Enable update for authenticated users" on payment_requests for update using (auth.role() = 'authenticated');
