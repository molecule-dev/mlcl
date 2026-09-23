/**
 * Shared UUID-shape guard for :id route params and body-supplied entity ids.
 *
 * The listings/bids/watchlist tables key on Postgres UUID columns — a
 * non-UUID string ("first", a slug, a truncated id) makes the parameterized
 * query throw 22P02 (invalid_input_syntax), which surfaces as a 500. Validate
 * the shape BEFORE the value reaches the database and answer 404/400 instead.
 *
 * @module
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}
