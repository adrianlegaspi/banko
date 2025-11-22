-- Add dice_sides to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS dice_sides INTEGER DEFAULT 12;

-- Create game_events table
CREATE TABLE IF NOT EXISTS game_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL, -- 'dice_roll'
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Policies for game_events
CREATE POLICY "Enable read access for all users" ON game_events FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON game_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON game_events TO postgres;
GRANT ALL ON game_events TO anon;
GRANT ALL ON game_events TO authenticated;
GRANT ALL ON game_events TO service_role;
