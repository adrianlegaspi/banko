-- Player board status (per room + player)
CREATE TABLE IF NOT EXISTS player_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
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

-- Seed status rows for existing players
INSERT INTO player_status (room_code, player_id)
SELECT r.room_code, p.id
FROM players p
JOIN rooms r ON p.room_id = r.id
ON CONFLICT (room_code, player_id) DO NOTHING;

-- Property ownership table
CREATE TABLE IF NOT EXISTS property_ownership (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES rooms(room_code) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  tile_id INTEGER NOT NULL,
  houses INTEGER DEFAULT 0,
  hotels INTEGER DEFAULT 0,
  is_mortgaged BOOLEAN DEFAULT FALSE,
  purchase_price NUMERIC(10, 2) NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_code, tile_id)
);

-- Event cards table (replaces Chance/Community Chest)
CREATE TABLE IF NOT EXISTS event_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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

-- Insert default event cards
INSERT INTO event_cards (type, title, description, action_type, amount) VALUES
-- Tech Events
('tech', 'Software Update', 'Receive consulting fee', 'collect_bank', 200),
('tech', 'Server Crash', 'Pay for emergency repairs', 'pay_bank', 150),
('tech', 'IPO Launch', 'Your startup goes public, collect $300', 'collect_bank', 300),
('tech', 'Data Breach', 'Pay security audit fees', 'pay_bank', 100),
('tech', 'Patent Approved', 'Collect royalties', 'collect_bank', 150),

-- Market Events
('market', 'Stock Dividend', 'Collect dividend payment', 'collect_bank', 50),
('market', 'Market Crash', 'Pay $50 to each player', 'pay_players', 50),
('market', 'Bull Run', 'Collect $25 from each player', 'collect_players', 25),
('market', 'Margin Call', 'Pay broker fees', 'pay_bank', 200),

-- Global Events
('global', 'Tax Refund', 'Collect government refund', 'collect_bank', 100),
('global', 'Carbon Tax', 'Pay environmental fees $40 per house, $115 per hotel', 'repairs', NULL),
('global', 'Stimulus Package', 'Government bailout, collect $200', 'collect_bank', 200),

-- Industry Events
('industry', 'Supply Chain Crisis', 'Go back 3 spaces', 'move_back', NULL, 3),
('industry', 'Industry Award', 'You won! Collect $100', 'collect_bank', 100),
('industry', 'Regulatory Fine', 'SEC violation, go to jail', 'go_to_jail', NULL),
('industry', 'Merger Bonus', 'Advance to GO', 'move_to', NULL, 0),

-- Innovation Events
('innovation', 'R&D Grant', 'Government grant received', 'collect_bank', 150),
('innovation', 'Failed Experiment', 'Pay lab costs', 'pay_bank', 75),
('innovation', 'Breakthrough Discovery', 'Advance to Microsoft', 'move_to', NULL, 39),

-- Boom Events
('boom', 'Economic Boom', 'Everyone collects $50', 'collect_bank', 50),
('boom', 'Get Out of Jail Free', 'Keep this card', 'get_out_jail', NULL),
('boom', 'Expansion Costs', 'Pay $25 per house, $100 per hotel', 'repairs', NULL);

-- Game state tracking
CREATE TABLE IF NOT EXISTS game_state (
  room_code TEXT PRIMARY KEY REFERENCES rooms(room_code) ON DELETE CASCADE,
  current_event_deck JSONB DEFAULT '[]'::JSONB,
  used_event_cards JSONB DEFAULT '[]'::JSONB,
  free_parking_pot NUMERIC(10, 2) DEFAULT 0,
  houses_remaining INTEGER DEFAULT 32,
  hotels_remaining INTEGER DEFAULT 12,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_ownership_room ON property_ownership(room_code);
CREATE INDEX IF NOT EXISTS idx_property_ownership_player ON property_ownership(room_code, player_id);
CREATE INDEX IF NOT EXISTS idx_player_status_room_position ON player_status(room_code, position);

-- Enable RLS
ALTER TABLE player_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_state ENABLE ROW LEVEL SECURITY;

-- Policies for player_status
DROP POLICY IF EXISTS "Enable read access for all users" ON player_status;
CREATE POLICY "Enable read access for all users" ON player_status FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON player_status;
CREATE POLICY "Enable insert for authenticated users" ON player_status FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON player_status;
CREATE POLICY "Enable update for authenticated users" ON player_status FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policies for property_ownership
DROP POLICY IF EXISTS "Enable read access for all users" ON property_ownership;
CREATE POLICY "Enable read access for all users" ON property_ownership FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON property_ownership;
CREATE POLICY "Enable insert for authenticated users" ON property_ownership FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON property_ownership;
CREATE POLICY "Enable update for authenticated users" ON property_ownership FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Policies for event_cards
DROP POLICY IF EXISTS "Enable read access for all users" ON event_cards;
CREATE POLICY "Enable read access for all users" ON event_cards FOR SELECT USING (true);

-- Policies for game_state
DROP POLICY IF EXISTS "Enable read access for all users" ON game_state;
CREATE POLICY "Enable read access for all users" ON game_state FOR SELECT USING (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON game_state;
CREATE POLICY "Enable insert for authenticated users" ON game_state FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "Enable update for authenticated users" ON game_state;
CREATE POLICY "Enable update for authenticated users" ON game_state FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Grant permissions
GRANT ALL ON player_status TO postgres, anon, authenticated, service_role;
GRANT ALL ON property_ownership TO postgres, anon, authenticated, service_role;
GRANT ALL ON event_cards TO postgres, anon, authenticated, service_role;
GRANT ALL ON game_state TO postgres, anon, authenticated, service_role;

-- Enable real-time for new tables safely
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY['property_ownership', 'game_state', 'player_status'];
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
