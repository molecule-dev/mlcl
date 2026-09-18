-- music-daw: per-user preferences (audio device, MIDI input, shortcuts,
-- producer handle from signup). One JSONB blob keyed by user_id keeps
-- the schema small and lets the frontend evolve the preferences shape
-- without further migrations.

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
