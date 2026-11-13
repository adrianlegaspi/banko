-- Add status column to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Add comment for documentation
COMMENT ON COLUMN players.status IS 'Player status: active, defeated';
