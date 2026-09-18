-- Seed sitters so the marketplace renders real cards on first boot.
-- These are independent of any user account (user_id IS NULL); they
-- represent platform-onboarded sitters that any owner can browse and book.
--
-- Idempotent: only inserts when zero independent sitter rows exist, so a
-- subsequent migration replay (e.g. after a wipe-and-reseed) won't double
-- the population.

DO $seed_sitters$
DECLARE
  existing_independent INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_independent FROM public.sitters WHERE user_id IS NULL;
  IF existing_independent > 0 THEN
    RETURN;
  END IF;

  INSERT INTO public.sitters
    (display_name, bio, services, hourly_rate_cents, location_city, avg_rating, total_bookings, is_verified, is_active)
  VALUES
    (
      'Maya Chen',
      'Certified dog trainer with 7 years of experience. Specializing in puppy socialization and house-training. Two cats and a rescued greyhound at home.',
      '["walks","drop_in","boarding"]'::jsonb,
      3200,
      'Brooklyn, NY',
      4.92, 184, true, true
    ),
    (
      'Diego Alvarez',
      'Veterinary tech by day, sitter on weekends. Comfortable administering medications and managing senior pets. Reliable and detail-oriented.',
      '["drop_in","overnight","medication"]'::jsonb,
      4500,
      'Austin, TX',
      4.88, 96, true, true
    ),
    (
      'Priya Shah',
      'Cat-only specialist. Quiet apartment, no other pets, and lots of patience for shy or anxious felines. Daily photo updates included.',
      '["drop_in","boarding"]'::jsonb,
      2800,
      'San Francisco, CA',
      5.0, 73, true, true
    ),
    (
      'Jordan Bell',
      'Experienced with high-energy breeds. Long off-leash walks at fenced parks plus structured play. Background-checked, fully insured.',
      '["walks","drop_in"]'::jsonb,
      3500,
      'Portland, OR',
      4.79, 142, true, true
    ),
    (
      'Sara Lindqvist',
      'Overnight host with a fenced yard and a senior golden retriever. Limit one guest dog at a time so your pup gets undivided attention.',
      '["overnight","boarding"]'::jsonb,
      6500,
      'Seattle, WA',
      4.95, 58, true, true
    ),
    (
      'Marcus Johnson',
      'Reptile and small-animal specialist. Years of experience caring for snakes, geckos, rabbits, and guinea pigs. Custom feeding schedules.',
      '["drop_in"]'::jsonb,
      2500,
      'Chicago, IL',
      4.85, 41, false, true
    ),
    (
      'Yuki Tanaka',
      'Bilingual sitter (English/Japanese). Available for daily walks and drop-in visits in the SoMa and Mission districts. Photos and GPS tracking shared after every visit.',
      '["walks","drop_in"]'::jsonb,
      3000,
      'San Francisco, CA',
      4.97, 112, true, true
    ),
    (
      'Aisha Patel',
      'Pet first-aid certified. Specializing in care for diabetic and chronically ill pets. Detailed daily reports on medication, eating, and behavior.',
      '["drop_in","medication","overnight"]'::jsonb,
      4800,
      'Boston, MA',
      4.91, 87, true, true
    );
END
$seed_sitters$;
