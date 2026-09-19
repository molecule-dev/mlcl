-- book-tracker: app-specific tables. The base scaffold ships migrations
-- for users / users_secrets / devices / tags / resource_tags only;
-- everything below is referenced from api/handlers/*.ts and must exist
-- before the api boots.

-- Catalog of books the user has entered. Owned per user so every read/write
-- is ownership-scoped (no cross-user catalog in this template).
CREATE TABLE IF NOT EXISTS books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  page_count INTEGER NOT NULL DEFAULT 200,
  genres JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_style TEXT NOT NULL DEFAULT 'teal',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS books_user_id_idx ON books (user_id);
CREATE INDEX IF NOT EXISTS books_user_created_idx ON books (user_id, created_at DESC);

-- Per-user shelf state for a book: which shelf it sits on, reading
-- progress, and the rating/review written after finishing.
CREATE TABLE IF NOT EXISTS user_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id UUID NOT NULL,
  shelf TEXT NOT NULL DEFAULT 'want_to_read'
    CHECK (shelf IN ('want_to_read', 'reading', 'read', 'dnf')),
  current_page INTEGER NOT NULL DEFAULT 0,
  started_at DATE,
  finished_at DATE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_books_user_book_uq UNIQUE (user_id, book_id)
);
CREATE INDEX IF NOT EXISTS user_books_user_id_idx ON user_books (user_id);
CREATE INDEX IF NOT EXISTS user_books_user_shelf_idx ON user_books (user_id, shelf);
CREATE INDEX IF NOT EXISTS user_books_finished_idx ON user_books (user_id, finished_at);

-- A logged reading sitting: minutes spent + pages covered on a given day.
CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_book_id UUID NOT NULL,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  pages_read INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS reading_sessions_user_book_idx ON reading_sessions (user_book_id);
CREATE INDEX IF NOT EXISTS reading_sessions_user_id_idx ON reading_sessions (user_id);
CREATE INDEX IF NOT EXISTS reading_sessions_user_date_idx ON reading_sessions (user_id, date);

-- One reading challenge row per user per year (book-count goal).
CREATE TABLE IF NOT EXISTS reading_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  goal_books INTEGER NOT NULL DEFAULT 12,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT reading_challenges_user_year_uq UNIQUE (user_id, year)
);
CREATE INDEX IF NOT EXISTS reading_challenges_user_idx ON reading_challenges (user_id);

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
