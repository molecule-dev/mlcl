-- music-daw: app-specific tables. The base scaffold ships migrations
-- for users / devices / payments / usersSecrets only; everything below
-- is referenced from api/handlers/*.ts and must exist before the api
-- boots.

CREATE TABLE IF NOT EXISTS music_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  bpm INTEGER NOT NULL DEFAULT 120,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  duration NUMERIC(10, 3) NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audio_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Track',
  type TEXT NOT NULL DEFAULT 'audio',
  instrument_id UUID,
  volume NUMERIC(5, 4) NOT NULL DEFAULT 0.8,
  pan NUMERIC(5, 4) NOT NULL DEFAULT 0,
  muted BOOLEAN NOT NULL DEFAULT FALSE,
  solo BOOLEAN NOT NULL DEFAULT FALSE,
  armed BOOLEAN NOT NULL DEFAULT FALSE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audio_effects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'reverb',
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audio_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  user_id UUID NOT NULL,
  format TEXT NOT NULL DEFAULT 'wav',
  quality TEXT NOT NULL DEFAULT 'high',
  sample_rate INTEGER NOT NULL DEFAULT 44100,
  status TEXT NOT NULL DEFAULT 'pending',
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL user_id signals a built-in / library instrument readable by all
  -- authenticated users. Non-NULL means a user-owned preset.
  user_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'synth',
  type TEXT NOT NULL DEFAULT 'oscillator',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL owner means a shared library sample (readable by every authed user).
  user_id UUID,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  bpm INTEGER,
  music_key TEXT,
  length_sec NUMERIC(10, 3) NOT NULL DEFAULT 0,
  waveform_peaks JSONB,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'audio',
  start_time NUMERIC(10, 3) NOT NULL DEFAULT 0,
  duration NUMERIC(10, 3) NOT NULL DEFAULT 0,
  source_url TEXT,
  notes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS midi_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL,
  user_id UUID NOT NULL,
  pitch INTEGER NOT NULL,
  velocity INTEGER NOT NULL DEFAULT 100,
  start NUMERIC(10, 4) NOT NULL DEFAULT 0,
  duration NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  -- The owner of the underlying project — used to scope IDOR (only the
  -- project owner can manage the collaborator row).
  user_id UUID NOT NULL,
  -- The user being granted access (may be NULL until invitee signs up
  -- — invite_email is then the rendezvous point).
  collaborator_user_id UUID,
  invitee_email TEXT,
  role TEXT NOT NULL DEFAULT 'editor',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
