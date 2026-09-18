-- Cap aggregate-rating skew: enforce at most one review per reviewer per
-- booking. The review handler requires a completed booking and derives the
-- tutor from it, but a concurrent double-submit could still create two rows
-- for the same session before the application-level duplicate check sees the
-- first. This UNIQUE index is the hard backstop; the handler catches the
-- 23505 violation and returns 409.
--
-- Partial (WHERE booking_id IS NOT NULL): the seed migration inserts demo
-- reviews with a NULL booking_id (pre-platform history), and several share a
-- reviewer_id — excluding NULLs keeps those legitimate and only constrains
-- real, booking-backed reviews (which now always carry a booking_id).
-- Idempotent: re-runs safely on existing schemas.

CREATE UNIQUE INDEX IF NOT EXISTS reviews_reviewer_booking_uniq
  ON public.reviews (reviewer_id, booking_id)
  WHERE booking_id IS NOT NULL;
