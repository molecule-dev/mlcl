-- habit-tracker: app-specific tables. The base scaffold ships migrations
-- for users / users_secrets / devices / tags / resource_tags only;
-- everything below is referenced from api/handlers/*.ts and must exist
-- before the api boots.

CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  description TEXT,
  category TEXT,
  cadence TEXT NOT NULL DEFAULT 'daily',
  days_of_week JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  reminder_time TEXT,
  color TEXT,
  target_count INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS habits_user_id_idx ON habits (user_id);
CREATE INDEX IF NOT EXISTS habits_user_archived_idx ON habits (user_id, archived_at);

CREATE TABLE IF NOT EXISTS habit_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 1,
  was_freeze BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS habit_entries_habit_id_idx ON habit_entries (habit_id);
CREATE INDEX IF NOT EXISTS habit_entries_user_id_idx ON habit_entries (user_id);
CREATE INDEX IF NOT EXISTS habit_entries_date_idx ON habit_entries (date);
CREATE UNIQUE INDEX IF NOT EXISTS habit_entries_habit_date_uq ON habit_entries (habit_id, date);

CREATE TABLE IF NOT EXISTS habit_freezes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_id UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_for_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS habit_freezes_user_id_idx ON habit_freezes (user_id);
CREATE INDEX IF NOT EXISTS habit_freezes_user_unused_idx ON habit_freezes (user_id, used_for_date);

CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  threshold_days INTEGER NOT NULL,
  tier TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS achievements_code_idx ON achievements (code);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progress_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_achievements_user_id_idx ON user_achievements (user_id);
CREATE INDEX IF NOT EXISTS user_achievements_user_unlocked_idx ON user_achievements (user_id, unlocked_at);
CREATE UNIQUE INDEX IF NOT EXISTS user_achievements_user_achievement_uq ON user_achievements (user_id, achievement_id);

CREATE TABLE IF NOT EXISTS reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  habit_id UUID NOT NULL,
  time_of_day TEXT NOT NULL,
  days_of_week JSONB NOT NULL DEFAULT '[0,1,2,3,4,5,6]'::jsonb,
  channel TEXT NOT NULL DEFAULT 'push',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON reminders (user_id);
CREATE INDEX IF NOT EXISTS reminders_habit_id_idx ON reminders (habit_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, read);
CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);

-- Static reference seed for the achievement catalog (bronze/silver/gold milestones).
INSERT INTO achievements (code, name, description, icon, threshold_days, tier)
VALUES
  ('first-step',   'First Step',         'Complete your first habit entry.',    '🌱',   1,   'bronze'),
  ('three-day',    'Three Days Strong',  'Maintain a 3-day streak.',            '🔥',   3,   'bronze'),
  ('week-warrior', 'Week Warrior',       'Maintain a 7-day streak.',            '⚔️',   7,   'silver'),
  ('two-weeks',    'Two-Week Trooper',   'Maintain a 14-day streak.',           '💪',   14,  'silver'),
  ('month-master', 'Month Master',       'Maintain a 30-day streak.',           '🏆',   30,  'gold'),
  ('quarter',      'Quarter Champion',   'Maintain a 90-day streak.',           '🥇',   90,  'gold'),
  ('half-year',    'Half-Year Hero',     'Maintain a 180-day streak.',          '🌟',   180, 'gold'),
  ('year-legend',  'Year Legend',        'Maintain a 365-day streak.',          '👑',   365, 'gold')
ON CONFLICT (code) DO NOTHING;
