/**
 * Shared UUID-shape guard for :id route params and client-supplied entity-id
 * filters (e.g. `?property_id=`).
 *
 * Every entity table in this app keys on Postgres UUID columns — a non-UUID
 * string ("placeholder", a slug, a truncated id) makes the parameterized
 * query throw 22P02 (invalid_input_syntax), which surfaces as a 500. Validate
 * the shape BEFORE the value reaches the database and answer 404 (detail
 * routes) / an empty list (filtered list routes) instead.
 *
 * @module
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

/**
 * Normalize a client-supplied id filter: a valid UUID passes through,
 * anything else becomes null (→ the caller answers "no rows match" —
 * a non-UUID id cannot identify a row, so an empty result is exact,
 * not a fallback).
 */
export function uuidOrNone(value: unknown): string | null {
  return isUuid(value) ? value : null
}
