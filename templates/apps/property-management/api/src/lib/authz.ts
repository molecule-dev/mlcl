/**
 * Authorization helpers for property-management.
 *
 * Every owner-scoped resource (properties, units, tenants, leases,
 * maintenance_requests, rent_payments) must be reachable only by its
 * owner. Use `requireUserOwnership` in every handler that derives a row
 * from a path parameter. We standardise on 404 for non-owner reads /
 * writes so an attacker cannot probe row existence (G6 — IDOR).
 */

import { findById } from '@molecule/api-database'

import { isUuid } from '../handlers/_uuid.js'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

/**
 * Look up a row in `table` by id and verify the caller owns it via the
 * row's `user_id` column. Returns the row on success, `{ ok: false,
 * status: 404 }` when the row is missing, the id is not a UUID shape
 * (every table keys on uuid — a non-UUID value would make the query
 * throw 22P02 and surface as a 500; not-a-UUID is simply not found),
 * or owned by a different user.
 */
export async function requireUserOwnership<
  T extends { user_id?: unknown } = Record<string, unknown>,
>(table: string, rowId: string, userId: string): Promise<AuthzResult<T>> {
  if (!isUuid(rowId)) return { ok: false, status: 404 }
  const row = await findById<T>(table, rowId)
  if (!row) return { ok: false, status: 404 }
  if (String((row as { user_id?: unknown }).user_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}
