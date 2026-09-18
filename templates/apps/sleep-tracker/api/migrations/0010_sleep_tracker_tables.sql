-- sleep-tracker: app-specific tables. The base scaffold ships migrations
-- for users / users_secrets / devices only; everything below is referenced
-- from api/handlers/*.ts and must exist before the api boots.

CREATE TABLE IF NOT EXISTS sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sleep_date DATE NOT NULL,
  bedtime TIMESTAMPTZ NOT NULL,
  wake_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER,
  efficiency_pct NUMERIC(5,2),
  interruptions INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'manual',
  source_payload JSONB,
  notes TEXT NOT NULL DEFAULT '',
  factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  sleep_stages JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sleep_logs_user_id_idx ON sleep_logs (user_id);
CREATE INDEX IF NOT EXISTS sleep_logs_user_date_idx ON sleep_logs (user_id, sleep_date DESC);
CREATE UNIQUE INDEX IF NOT EXISTS sleep_logs_user_date_uq ON sleep_logs (user_id, sleep_date);

CREATE TABLE IF NOT EXISTS sleep_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sleep_log_id UUID NOT NULL,
  user_id UUID NOT NULL,
  stage TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sleep_stages_sleep_log_idx ON sleep_stages (sleep_log_id, starts_at);
CREATE INDEX IF NOT EXISTS sleep_stages_user_id_idx ON sleep_stages (user_id);

CREATE TABLE IF NOT EXISTS sleep_factors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sleep_log_id UUID,
  kind TEXT NOT NULL,
  value TEXT,
  numeric_value NUMERIC,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sleep_factors_user_idx ON sleep_factors (user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS sleep_factors_log_idx ON sleep_factors (sleep_log_id);

CREATE TABLE IF NOT EXISTS factor_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  impact TEXT NOT NULL DEFAULT 'neutral',
  unit TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS factor_definitions_slug_idx ON factor_definitions (slug);

CREATE TABLE IF NOT EXISTS sleep_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  alarm_time TEXT NOT NULL,
  window_minutes INTEGER NOT NULL DEFAULT 30,
  days_of_week JSONB NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  sound TEXT NOT NULL DEFAULT 'gentle',
  vibration_pattern TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sleep_alarms_user_idx ON sleep_alarms (user_id);
CREATE INDEX IF NOT EXISTS sleep_alarms_user_active_idx ON sleep_alarms (user_id, enabled);

CREATE TABLE IF NOT EXISTS wearable_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  external_user_id TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_synced_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS wearable_connections_user_idx ON wearable_connections (user_id);
CREATE INDEX IF NOT EXISTS wearable_connections_user_active_idx ON wearable_connections (user_id) WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS coaching_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  hero_image_key TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS coaching_articles_slug_idx ON coaching_articles (slug);
CREATE INDEX IF NOT EXISTS coaching_articles_published_idx ON coaching_articles (is_published, published_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);

-- Static reference seed for the factor catalog.
INSERT INTO factor_definitions (slug, label, category, impact, unit, icon)
VALUES
  ('caffeine',    'Caffeine',   'substance', 'negative', 'mg',     'local_cafe'),
  ('alcohol',     'Alcohol',    'substance', 'negative', 'drinks', 'local_bar'),
  ('exercise',    'Exercise',   'activity',  'positive', 'min',    'directions_run'),
  ('screen_time', 'Screen Time','activity',  'negative', 'min',    'screen_share'),
  ('stress',      'Stress',     'mental',    'negative', 'rating', 'sentiment_stressed'),
  ('meditation',  'Meditation', 'activity',  'positive', 'min',    'self_improvement'),
  ('nap',         'Nap',        'sleep',     'neutral',  'min',    'bed'),
  ('heavy_meal',  'Heavy Meal', 'diet',      'negative', NULL,     'restaurant'),
  ('reading',     'Reading',    'activity',  'positive', 'min',    'menu_book'),
  ('travel',      'Travel',     'lifestyle', 'neutral',  NULL,     'flight'),
  ('late_meal',   'Late Meal',  'diet',      'negative', NULL,     'dinner_dining'),
  ('cold_room',   'Cold Room',  'environment','positive', NULL,    'ac_unit')
ON CONFLICT (slug) DO NOTHING;

-- Static reference seed for a few coaching articles.
INSERT INTO coaching_articles (slug, title, body_markdown, category, is_premium, is_published)
VALUES
  ('wind-down-routine', 'Build a Wind-Down Routine',
    '# Build a Wind-Down Routine

A consistent 30-minute pre-sleep ritual signals your body that it is time to rest. Dim the lights, put devices away, and try a calming activity like reading.', 'sleep-hygiene', FALSE, TRUE),
  ('caffeine-cutoff', 'Caffeine Cutoff Times',
    '# Caffeine Cutoff Times

Caffeine has a half-life of 5-7 hours. Stop intake by 2pm to give it time to clear before bedtime.', 'lifestyle', FALSE, TRUE),
  ('sleep-debt-recovery', 'Recovering from Sleep Debt (Pro)',
    '# Recovering from Sleep Debt

A premium guide to staged recovery from chronic short sleep, with weekly catch-up plans.', 'recovery', TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;
