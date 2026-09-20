import { type AuthzResult, requireOwnership } from '@molecule/api-bonds-default-express'
import { findById } from '@molecule/api-database'

export {
  type AuthzResult,
  requireOwnership,
  requireUserOwnership,
} from '@molecule/api-bonds-default-express'

/**
 * Two-step ownership check: looks up `childTable[childId]`, reads its
 * foreign-key column to find the parent row, then delegates to
 * `requireOwnership(parentTable, parentId, userId)`. Used by handlers
 * that operate on child rows (quote_items, job_checklist, job_notes,
 * invoice_items) where ownership lives on the parent (quotes, jobs,
 * invoices).
 *
 * Returns `{ ok: false, status: 404 }` when either lookup misses or
 * the parent isn't owned by the supplied user (existence-leak safe).
 */
export async function requireParentOwnership<
  P extends { owner_id?: unknown } = Record<string, unknown>,
>(
  childTable: string,
  childId: string,
  parentTable: string,
  foreignKey: string,
  userId: string,
): Promise<AuthzResult<P>> {
  const child = await findById<Record<string, unknown>>(childTable, childId)
  if (!child) return { ok: false, status: 404 }
  const parentId = child[foreignKey]
  if (typeof parentId !== 'string') return { ok: false, status: 404 }
  return requireOwnership<P>(parentTable, parentId, userId)
}
