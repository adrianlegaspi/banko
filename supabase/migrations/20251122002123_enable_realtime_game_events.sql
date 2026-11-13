-- Enable realtime for game_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'game_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
  END IF;
END $$;
