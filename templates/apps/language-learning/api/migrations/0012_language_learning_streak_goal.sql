-- Goal-based streak keeping. The Settings page promises "Streaks are kept
-- whenever you hit the goal", but the streak incremented on the first lesson of
-- any new day, ignoring daily_goal_xp. Track today's accumulated XP (reset each
-- new day) and the last date the goal was met, so the streak is credited only
-- when today's XP first reaches daily_goal_xp — and only once per day.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS daily_xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_goal_date date;
