-- course-marketplace: app-specific tables. The base scaffold ships
-- migrations for users / devices / payments / orders / reviews / tags only;
-- everything below is referenced from api/handlers/*.ts and must exist
-- before the api boots.
--
-- Authorship rules from INVENTORY.md:
--   - courses: instructor-owned writes; everyone reads when status='published'.
--   - lessons: instructor-owned writes (via parent course); reads gated by
--     enrollment OR free_preview = true.
--   - enrollments / lesson_progress / certificates: owner-only.
--   - users gets is_instructor and instructor_bio columns appended below.

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT,
  thumbnail_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'beginner',
  duration_min INTEGER NOT NULL DEFAULT 0,
  total_lessons INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  total_enrollments INTEGER NOT NULL DEFAULT 0,
  rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS courses_instructor_id_idx ON courses (instructor_id, status);
CREATE INDEX IF NOT EXISTS courses_status_published_idx ON courses (status, published_at DESC);
CREATE INDEX IF NOT EXISTS courses_category_idx ON courses (category);
CREATE INDEX IF NOT EXISTS courses_featured_idx ON courses (featured) WHERE featured = TRUE;

CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_hls_url TEXT,
  thumbnail_url TEXT,
  duration_sec INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  free_preview BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS lessons_course_id_idx ON lessons (course_id, sort_order);
CREATE INDEX IF NOT EXISTS lessons_user_id_idx ON lessons (user_id);

CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  payment_id UUID,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS enrollments_user_id_idx ON enrollments (user_id, enrolled_at DESC);
CREATE INDEX IF NOT EXISTS enrollments_course_id_idx ON enrollments (course_id);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  course_id UUID,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_id_idx ON lesson_progress (user_id);
CREATE INDEX IF NOT EXISTS lesson_progress_lesson_id_idx ON lesson_progress (lesson_id);

CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  course_id UUID NOT NULL,
  enrollment_id UUID,
  certificate_number TEXT UNIQUE NOT NULL,
  pdf_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);
CREATE INDEX IF NOT EXISTS certificates_user_id_idx ON certificates (user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS certificates_course_id_idx ON certificates (course_id);

-- Extend the canonical `users` table with instructor metadata so a user can
-- author courses without a separate `instructors` table. Idempotent — runs
-- only when the column does not already exist.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'is_instructor'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "is_instructor" BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'instructor_bio'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "instructor_bio" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'instructor_avatar_url'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "instructor_avatar_url" TEXT;
  END IF;
END $$;
