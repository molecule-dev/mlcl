-- workout-tracker: app-specific tables. The base scaffold ships migrations
-- for users / users_secrets / devices only; everything below is referenced
-- from api/handlers/*.ts and must exist before the api boots.

CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  slug TEXT,
  name TEXT NOT NULL,
  description TEXT,
  instructions TEXT,
  muscle_group TEXT,
  muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  equipment TEXT,
  category TEXT,
  difficulty TEXT,
  video_s3_key TEXT,
  image_s3_key TEXT,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS exercises_user_id_idx ON exercises (user_id);
CREATE INDEX IF NOT EXISTS exercises_name_idx ON exercises (name);
CREATE INDEX IF NOT EXISTS exercises_muscle_group_idx ON exercises (muscle_group);
CREATE INDEX IF NOT EXISTS exercises_equipment_idx ON exercises (equipment);
CREATE UNIQUE INDEX IF NOT EXISTS exercises_slug_uq ON exercises (slug) WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_muscle_groups JSONB NOT NULL DEFAULT '[]'::jsonb,
  estimated_duration_minutes INTEGER,
  day_count INTEGER NOT NULL DEFAULT 1,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS routines_user_id_idx ON routines (user_id);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  day_index INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  target_sets INTEGER NOT NULL DEFAULT 3,
  target_reps INTEGER NOT NULL DEFAULT 10,
  target_weight_pct NUMERIC,
  target_rest_seconds INTEGER NOT NULL DEFAULT 90,
  sets INTEGER NOT NULL DEFAULT 3,
  reps INTEGER NOT NULL DEFAULT 10,
  rest_seconds INTEGER NOT NULL DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS routine_exercises_routine_id_idx ON routine_exercises (routine_id);
CREATE INDEX IF NOT EXISTS routine_exercises_exercise_id_idx ON routine_exercises (exercise_id);

CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  routine_id UUID,
  day_index INTEGER,
  name TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  total_volume NUMERIC NOT NULL DEFAULT 0,
  total_volume_kg NUMERIC NOT NULL DEFAULT 0,
  body_weight_kg NUMERIC,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts (user_id);
CREATE INDEX IF NOT EXISTS workouts_user_started_idx ON workouts (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS workouts_routine_id_idx ON workouts (routine_id);

CREATE TABLE IF NOT EXISTS workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL,
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  set_index INTEGER NOT NULL DEFAULT 0,
  set_number INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  weight NUMERIC NOT NULL DEFAULT 0,
  weight_kg NUMERIC NOT NULL DEFAULT 0,
  weight_unit TEXT NOT NULL DEFAULT 'kg',
  reps INTEGER NOT NULL DEFAULT 0,
  rpe NUMERIC,
  is_warmup BOOLEAN NOT NULL DEFAULT FALSE,
  is_dropset BOOLEAN NOT NULL DEFAULT FALSE,
  is_completed BOOLEAN NOT NULL DEFAULT TRUE,
  completed_at TIMESTAMPTZ,
  rest_seconds INTEGER,
  rest_seconds_actual INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS workout_sets_workout_id_idx ON workout_sets (workout_id);
CREATE INDEX IF NOT EXISTS workout_sets_user_id_idx ON workout_sets (user_id);
CREATE INDEX IF NOT EXISTS workout_sets_exercise_id_idx ON workout_sets (exercise_id);
CREATE INDEX IF NOT EXISTS workout_sets_workout_setidx_idx ON workout_sets (workout_id, set_index);

CREATE TABLE IF NOT EXISTS personal_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exercise_id UUID NOT NULL,
  workout_id UUID,
  kind TEXT NOT NULL DEFAULT '1rm_estimated',
  value NUMERIC NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS personal_records_user_id_idx ON personal_records (user_id);
CREATE INDEX IF NOT EXISTS personal_records_user_exercise_idx ON personal_records (user_id, exercise_id);
CREATE INDEX IF NOT EXISTS personal_records_user_achieved_idx ON personal_records (user_id, achieved_at DESC);

CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  weight_kg NUMERIC,
  body_fat_pct NUMERIC,
  chest_cm NUMERIC,
  waist_cm NUMERIC,
  hips_cm NUMERIC,
  thigh_cm NUMERIC,
  bicep_cm NUMERIC,
  photo_s3_key TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS body_measurements_user_id_idx ON body_measurements (user_id);
CREATE INDEX IF NOT EXISTS body_measurements_user_recorded_idx ON body_measurements (user_id, recorded_at DESC);

-- Static reference seed for the system exercise catalog. Real exercise
-- libraries (wger, Free Exercise DB) are pulled in by separate ingestion
-- jobs; the following slugs are the minimum required for the smoke E2E
-- and seed enough variety to build a starter routine.
INSERT INTO exercises (slug, name, description, muscle_group, muscle_groups, equipment, category, difficulty, is_custom)
VALUES
  ('barbell-bench-press', 'Barbell Bench Press', 'Compound chest press with a barbell', 'chest',  '["chest","triceps","shoulders"]'::jsonb, 'barbell',    'compound', 'intermediate', FALSE),
  ('barbell-back-squat',  'Barbell Back Squat',  'Compound lower-body squat',           'legs',   '["quadriceps","glutes","hamstrings"]'::jsonb, 'barbell', 'compound', 'intermediate', FALSE),
  ('deadlift',            'Conventional Deadlift', 'Compound posterior-chain pull',     'back',   '["back","glutes","hamstrings"]'::jsonb, 'barbell', 'compound', 'advanced',     FALSE),
  ('overhead-press',      'Standing Overhead Press', 'Compound vertical shoulder press','shoulders', '["shoulders","triceps"]'::jsonb, 'barbell', 'compound', 'intermediate', FALSE),
  ('barbell-row',         'Barbell Bent-Over Row', 'Compound horizontal row',           'back',   '["back","biceps"]'::jsonb, 'barbell', 'compound', 'intermediate', FALSE),
  ('pull-up',             'Pull-Up',              'Bodyweight vertical pull',           'back',   '["back","biceps"]'::jsonb, 'bodyweight', 'compound', 'intermediate', FALSE),
  ('push-up',             'Push-Up',              'Bodyweight horizontal press',        'chest',  '["chest","triceps","shoulders"]'::jsonb, 'bodyweight', 'compound', 'beginner', FALSE),
  ('dumbbell-curl',       'Dumbbell Bicep Curl',  'Isolation bicep curl',               'biceps', '["biceps"]'::jsonb, 'dumbbell', 'isolation', 'beginner', FALSE)
ON CONFLICT (slug) WHERE slug IS NOT NULL DO NOTHING;
