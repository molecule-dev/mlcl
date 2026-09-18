-- photo-editor: app-specific tables. The base scaffold ships migrations
-- for users / devices / tags only; everything below is referenced from
-- api/src/handlers/*.ts and must exist before the api boots.

CREATE TABLE IF NOT EXISTS albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  cover_image_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS albums_user_id_idx ON albums (user_id);

CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  original_url TEXT NOT NULL,
  current_url TEXT NOT NULL,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  album_id UUID,
  edit_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS images_user_id_idx ON images (user_id);
CREATE INDEX IF NOT EXISTS images_album_id_idx ON images (album_id);
CREATE INDEX IF NOT EXISTS images_user_updated_idx ON images (user_id, "updatedAt");

CREATE TABLE IF NOT EXISTS adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_id UUID NOT NULL,
  adjustment_type TEXT NOT NULL,
  value NUMERIC(10, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS adjustments_user_id_idx ON adjustments (user_id);
CREATE INDEX IF NOT EXISTS adjustments_image_created_idx ON adjustments (image_id, created_at);

CREATE TABLE IF NOT EXISTS filter_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_id UUID NOT NULL,
  filter_type TEXT NOT NULL,
  intensity NUMERIC(10, 4) NOT NULL DEFAULT 1,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS filter_applications_user_id_idx ON filter_applications (user_id);
CREATE INDEX IF NOT EXISTS filter_applications_image_created_idx ON filter_applications (image_id, created_at);

CREATE TABLE IF NOT EXISTS filter_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS filter_presets_user_id_idx ON filter_presets (user_id);

CREATE TABLE IF NOT EXISTS exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_id UUID NOT NULL,
  format TEXT NOT NULL DEFAULT 'png',
  quality INTEGER NOT NULL DEFAULT 90,
  width INTEGER NOT NULL DEFAULT 0,
  height INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  output_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exports_user_id_idx ON exports (user_id);
CREATE INDEX IF NOT EXISTS exports_image_created_idx ON exports (image_id, created_at);

CREATE TABLE IF NOT EXISTS layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_id UUID NOT NULL,
  kind TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  opacity NUMERIC(5, 4) NOT NULL DEFAULT 1,
  blend_mode TEXT NOT NULL DEFAULT 'normal',
  z_index INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS layers_user_id_idx ON layers (user_id);
CREATE INDEX IF NOT EXISTS layers_image_zindex_idx ON layers (image_id, z_index);
