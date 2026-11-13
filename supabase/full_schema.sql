-- ==============================================================================
-- BANKO COMPLETE DATABASE SCHEMA
-- Fully consolidated and idempotent migration for Supabase
-- Target Project: gmtbatcsvuddnridvhnp
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES

-- ROOMS
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  room_name TEXT NOT NULL,
  initial_player_balance NUMERIC NOT NULL DEFAULT 0,
  bank_display_name TEXT NOT NULL DEFAULT 'Bank',
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'in_progress', 'finished')),
  shared_pot_balance NUMERIC NOT NULL DEFAULT 0,
  salary_amount NUMERIC NOT NULL DEFAULT 200,
  dice_sides INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PLAYERS
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  supabase_user_id UUID NOT NULL,
  nickname TEXT NOT NULL,
  color TEXT NOT NULL,
  current_balance NUMERIC NOT NULL DEFAULT 0,
  is_bank_operator BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  from_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  to_player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount >= 0),
  type TEXT NOT NULL CHECK (type IN ('bank_to_player', 'player_to_bank', 'player_to_player', 'pot_in', 'pot_out', 'reversal')),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAYMENT REQUESTS
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  from_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  to_player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GAME EVENTS (Dice rolls, notifications, etc.)
CREATE TABLE IF NOT EXISTS public.game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LOANS
CREATE TABLE IF NOT EXISTS public.loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MONOPOLY: PLAYER STATUS
CREATE TABLE IF NOT EXISTS public.player_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(room_code) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  is_jailed BOOLEAN NOT NULL DEFAULT FALSE,
  jail_turns_left INTEGER NOT NULL DEFAULT 0,
  has_passed_start BOOLEAN NOT NULL DEFAULT FALSE,
  doubles_count INTEGER NOT NULL DEFAULT 0,
  last_dice_roll JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (room_code, player_id)
);

-- MONOPOLY: PROPERTY OWNERSHIP
CREATE TABLE IF NOT EXISTS public.property_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL REFERENCES public.rooms(room_code) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  tile_id INTEGER NOT NULL,
  houses INTEGER DEFAULT 0,
  hotels INTEGER DEFAULT 0,
  is_mortgaged BOOLEAN DEFAULT FALSE,
  purchase_price NUMERIC(10, 2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_code, tile_id)
);

-- MONOPOLY: EVENT CARDS
CREATE TABLE IF NOT EXISTS public.event_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('tech', 'market', 'global', 'industry', 'innovation', 'boom')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('pay_bank', 'collect_bank', 'pay_players', 'collect_players', 'move_to', 'move_back', 'go_to_jail', 'get_out_jail', 'repairs')),
  amount NUMERIC(10, 2),
  target_position INTEGER,
  per_house_amount NUMERIC(10, 2),
  per_hotel_amount NUMERIC(10, 2),
  is_active BOOLEAN DEFAULT TRUE
);

-- MONOPOLY: GAME STATE
CREATE TABLE IF NOT EXISTS public.game_state (
  room_code TEXT PRIMARY KEY REFERENCES public.rooms(room_code) ON DELETE CASCADE,
  current_event_deck JSONB DEFAULT '[]'::JSONB,
  used_event_cards JSONB DEFAULT '[]'::JSONB,
  free_parking_pot NUMERIC(10, 2) DEFAULT 0,
  houses_remaining INTEGER DEFAULT 32,
  hotels_remaining INTEGER DEFAULT 12,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_players_room_user ON public.players(room_id, supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_room ON public.transactions(room_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_room ON public.payment_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_game_events_room ON public.game_events(room_id);
CREATE INDEX IF NOT EXISTS idx_loans_room ON public.loans(room_id);
CREATE INDEX IF NOT EXISTS idx_property_ownership_room ON public.property_ownership(room_code);
CREATE INDEX IF NOT EXISTS idx_property_ownership_player ON public.property_ownership(room_code, player_id);
CREATE INDEX IF NOT EXISTS idx_player_status_room_position ON public.player_status(room_code, position);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_state ENABLE ROW LEVEL SECURITY;

-- ROOMS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rooms;
CREATE POLICY "Enable read access for all users" ON public.rooms FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.rooms;
CREATE POLICY "Enable insert for authenticated users" ON public.rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.rooms;
CREATE POLICY "Enable update for authenticated users" ON public.rooms FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PLAYERS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.players;
CREATE POLICY "Enable read access for all users" ON public.players FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.players;
CREATE POLICY "Enable insert for authenticated users" ON public.players FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.players;
CREATE POLICY "Enable update for authenticated users" ON public.players FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- TRANSACTIONS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.transactions;
CREATE POLICY "Enable read access for all users" ON public.transactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.transactions;
CREATE POLICY "Enable insert for authenticated users" ON public.transactions FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.transactions;
CREATE POLICY "Enable update for authenticated users" ON public.transactions FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PAYMENT REQUESTS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.payment_requests;
CREATE POLICY "Enable read access for all users" ON public.payment_requests FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.payment_requests;
CREATE POLICY "Enable insert for authenticated users" ON public.payment_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.payment_requests;
CREATE POLICY "Enable update for authenticated users" ON public.payment_requests FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- GAME EVENTS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.game_events;
CREATE POLICY "Enable read access for all users" ON public.game_events FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.game_events;
CREATE POLICY "Enable insert for authenticated users only" ON public.game_events FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- LOANS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.loans;
CREATE POLICY "Enable read access for all users" ON public.loans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.loans;
CREATE POLICY "Enable insert for authenticated users only" ON public.loans FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.loans;
CREATE POLICY "Enable update for authenticated users only" ON public.loans FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PLAYER STATUS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.player_status;
CREATE POLICY "Enable read access for all users" ON public.player_status FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.player_status;
CREATE POLICY "Enable insert for authenticated users" ON public.player_status FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.player_status;
CREATE POLICY "Enable update for authenticated users" ON public.player_status FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- PROPERTY OWNERSHIP POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.property_ownership;
CREATE POLICY "Enable read access for all users" ON public.property_ownership FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.property_ownership;
CREATE POLICY "Enable insert for authenticated users" ON public.property_ownership FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.property_ownership;
CREATE POLICY "Enable update for authenticated users" ON public.property_ownership FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- EVENT CARDS POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.event_cards;
CREATE POLICY "Enable read access for all users" ON public.event_cards FOR SELECT USING (true);

-- GAME STATE POLICIES
DROP POLICY IF EXISTS "Enable read access for all users" ON public.game_state;
CREATE POLICY "Enable read access for all users" ON public.game_state FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.game_state;
CREATE POLICY "Enable insert for authenticated users" ON public.game_state FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.game_state;
CREATE POLICY "Enable update for authenticated users" ON public.game_state FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- 5. GRANTS
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- 6. STORED PROCEDURES / FUNCTIONS

-- perform_transaction handles balances atomically
CREATE OR REPLACE FUNCTION public.perform_transaction(
  p_room_id UUID,
  p_from_player_id UUID,
  p_to_player_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT
) RETURNS JSONB AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- 1. Insert Transaction
  INSERT INTO public.transactions (room_id, from_player_id, to_player_id, amount, type, description)
  VALUES (p_room_id, p_from_player_id, p_to_player_id, p_amount, p_type, p_description)
  RETURNING id INTO v_transaction_id;

  -- 2. Update Balances based on Type
  
  -- PLAYER TO PLAYER
  IF p_type = 'player_to_player' THEN
    UPDATE public.players SET current_balance = current_balance - p_amount WHERE id = p_from_player_id;
    UPDATE public.players SET current_balance = current_balance + p_amount WHERE id = p_to_player_id;
  END IF;

  -- BANK TO PLAYER
  IF p_type = 'bank_to_player' THEN
    UPDATE public.players SET current_balance = current_balance + p_amount WHERE id = p_to_player_id;
  END IF;

  -- PLAYER TO BANK
  IF p_type = 'player_to_bank' THEN
    UPDATE public.players SET current_balance = current_balance - p_amount WHERE id = p_from_player_id;
  END IF;
  
  -- POT IN (Player -> Pot)
  IF p_type = 'pot_in' THEN
    UPDATE public.players SET current_balance = current_balance - p_amount WHERE id = p_from_player_id;
    UPDATE public.rooms SET shared_pot_balance = shared_pot_balance + p_amount WHERE id = p_room_id;
  END IF;

  -- POT OUT (Pot -> Player)
  IF p_type = 'pot_out' THEN
    UPDATE public.rooms SET shared_pot_balance = shared_pot_balance - p_amount WHERE id = p_room_id;
    UPDATE public.players SET current_balance = current_balance + p_amount WHERE id = p_to_player_id;
  END IF;
  
  -- REVERSAL - Generic reversal logic
  IF p_type = 'reversal' THEN
     IF p_from_player_id IS NOT NULL THEN
       UPDATE public.players SET current_balance = current_balance - p_amount WHERE id = p_from_player_id;
     END IF;
     
     IF p_to_player_id IS NOT NULL THEN
       UPDATE public.players SET current_balance = current_balance + p_amount WHERE id = p_to_player_id;
     END IF;
  END IF;

  RETURN jsonb_build_object('id', v_transaction_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. REALTIME SETUP
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'rooms', 
    'players', 
    'transactions', 
    'payment_requests', 
    'game_events', 
    'loans', 
    'player_status', 
    'property_ownership', 
    'game_state'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- 8. DEFAULT SEED DATA FOR EVENT CARDS
INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'tech', 'Software Update', 'Receive consulting fee', 'collect_bank', 200, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Software Update');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'tech', 'Server Crash', 'Pay for emergency repairs', 'pay_bank', 150, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Server Crash');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'tech', 'IPO Launch', 'Your startup goes public, collect $300', 'collect_bank', 300, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'IPO Launch');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'tech', 'Data Breach', 'Pay security audit fees', 'pay_bank', 100, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Data Breach');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'tech', 'Patent Approved', 'Collect royalties', 'collect_bank', 150, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Patent Approved');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'market', 'Stock Dividend', 'Collect dividend payment', 'collect_bank', 50, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Stock Dividend');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'market', 'Market Crash', 'Pay $50 to each player', 'pay_players', 50, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Market Crash');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'market', 'Bull Run', 'Collect $25 from each player', 'collect_players', 25, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Bull Run');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'market', 'Margin Call', 'Pay broker fees', 'pay_bank', 200, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Margin Call');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'global', 'Tax Refund', 'Collect government refund', 'collect_bank', 100, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Tax Refund');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position, per_house_amount, per_hotel_amount)
SELECT 'global', 'Carbon Tax', 'Pay environmental fees $40 per house, $115 per hotel', 'repairs', NULL, NULL, 40, 115
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Carbon Tax');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'global', 'Stimulus Package', 'Government bailout, collect $200', 'collect_bank', 200, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Stimulus Package');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'industry', 'Supply Chain Crisis', 'Go back 3 spaces', 'move_back', NULL, 3
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Supply Chain Crisis');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'industry', 'Industry Award', 'You won! Collect $100', 'collect_bank', 100, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Industry Award');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'industry', 'Regulatory Fine', 'SEC violation, go to jail', 'go_to_jail', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Regulatory Fine');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'industry', 'Merger Bonus', 'Advance to GO', 'move_to', NULL, 0
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Merger Bonus');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'innovation', 'R&D Grant', 'Government grant received', 'collect_bank', 150, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'R&D Grant');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'innovation', 'Failed Experiment', 'Pay lab costs', 'pay_bank', 75, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Failed Experiment');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'innovation', 'Breakthrough Discovery', 'Advance to Microsoft', 'move_to', NULL, 39
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Breakthrough Discovery');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'boom', 'Economic Boom', 'Everyone collects $50', 'collect_bank', 50, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Economic Boom');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position)
SELECT 'boom', 'Get Out of Jail Free', 'Keep this card', 'get_out_jail', NULL, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Get Out of Jail Free');

INSERT INTO public.event_cards (type, title, description, action_type, amount, target_position, per_house_amount, per_hotel_amount)
SELECT 'boom', 'Expansion Costs', 'Pay $25 per house, $100 per hotel', 'repairs', NULL, NULL, 25, 100
WHERE NOT EXISTS (SELECT 1 FROM public.event_cards WHERE title = 'Expansion Costs');
