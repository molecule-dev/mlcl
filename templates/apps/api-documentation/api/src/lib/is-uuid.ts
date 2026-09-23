const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * True when `value` is shaped like a uuid.
 *
 * Every table in this app keys on `uuid` columns; a hand-typed or
 * malformed `:id` path param handed straight to `findById` makes
 * Postgres throw ("invalid input syntax for type uuid") and the route
 * 500s instead of 404ing. Guard `:id` routes with this BEFORE the
 * query and return 404 on a mismatch — a non-uuid id can never match
 * a row, so 404 is always the honest answer.
 */
export function isUuid(value: string | undefined | null): boolean {
  return typeof value === 'string' && UUID_RE.test(value)
}
