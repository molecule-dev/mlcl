/**
 * Authorization helpers for contract-management.
 *
 * Every owner-scoped resource (contracts, contract_templates,
 * counterparties, signatures, signature_events, notifications) must be
 * reachable only by its owner. Use these helpers in every handler that
 * derives a row from a path parameter — they replace bare `findById`
 * lookups with ownership-checked variants and return discriminated
 * results so handlers can branch on 404 vs. 403 without leaking
 * existence information.
 *
 * Per CLAUDE.md / mlcl-CLAUDE.md "no IDOR" rule (G6) we standardize on
 * 404-for-non-owner so an attacker cannot probe row existence.
 */

import { findById } from '@molecule/api-database'

export type AuthzResult<T> = { ok: true; row: T } | { ok: false; status: 404 }

/**
 * Look up a row in `table` by id and verify the caller owns it (the row
 * has a `user_id` column matching the caller's user id). Returns the
 * row on success, or `{ ok: false, status: 404 }` when missing OR owned
 * by a different user.
 */
export async function requireUserOwnership<
  T extends { user_id?: unknown } = Record<string, unknown>,
>(table: string, rowId: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, rowId)
  if (!row) return { ok: false, status: 404 }
  if (String((row as { user_id?: unknown }).user_id) !== String(userId)) {
    return { ok: false, status: 404 }
  }
  return { ok: true, row }
}

/**
 * Resolve a child row (signature, signature_event, contract_version)
 * and verify its parent contract is owned by the caller.
 */
export async function requireContractChildOwnership<
  T extends { contract_id?: unknown } = Record<string, unknown>,
>(table: string, childId: string, userId: string): Promise<AuthzResult<T>> {
  const row = await findById<T>(table, childId)
  if (!row) return { ok: false, status: 404 }
  const contractId = (row as { contract_id?: unknown }).contract_id
  if (!contractId) return { ok: false, status: 404 }
  const owns = await requireUserOwnership('contracts', String(contractId), userId)
  if (!owns.ok) return owns
  return { ok: true, row }
}
