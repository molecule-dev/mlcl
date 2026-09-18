/**
 * Response shape decorators — convert raw `budget_*` DB rows into the
 * front-end-expected shape (cents-typed amounts, ISO date strings,
 * resolved category/account names, etc.).
 *
 * The frontend treats every monetary value as integer cents so subtotals
 * stay exact; the DB stores `numeric(20,4)` decimal strings. We do the
 * conversion at the API boundary so the frontend never sees a string for
 * an amount and never has to do floating-point arithmetic.
 *
 * Group lookups (account name, category name, group name) get joined in
 * here too — the React pages render `tx.account_name` / `tx.category`
 * directly without holding their own lookup tables.
 *
 * @module
 */

import { findMany, type WhereCondition } from '@molecule/api-database'

/**
 * Raw rows are typed as `Row` (an alias for the loose
 * `Record<string, unknown>` shape that the database adapters return) and
 * narrowed via `pick*` helpers below. Decorators MUST tolerate
 * `Record<string, unknown>` from `findMany`/`findById` directly without
 * any handler-side casting.
 *
 * Decorators also accept `null` so that callers can pass
 * `MutationResult.data` (typed as `T | null`) directly. When `null` is
 * passed the decorator returns a row built from defaults; null only
 * happens if a write succeeded but the adapter didn't return the row,
 * which is a bug the caller should treat as a 500 — but keeping the
 * decorator total avoids littering callers with non-null assertions.
 */
type Row = Record<string, unknown>
type RowOrNull = Row | null

function r(row: RowOrNull): Row {
  return row ?? {}
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}
function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null
}
function asNumberOrString(v: unknown): string | number | null {
  if (typeof v === 'string' || typeof v === 'number') return v
  return null
}
function asBool(v: unknown): boolean {
  return v === true
}
function asNumber(v: unknown, dflt = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : dflt
}
function asIsoDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  return null
}

/** Convert any decimal/string/number value to integer cents. */
export function toCents(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return 0
  // Round to nearest cent to avoid floating-point dust
  return Math.round(n * 100)
}

export function decorateAccount(rowIn: RowOrNull): {
  id: string
  kind: string
  name: string
  institution: string
  mask: string
  balance_cents: number
  on_budget: boolean
  closed: boolean
  created_at: string | null
} {
  const row = r(rowIn)
  return {
    id: asString(row.id),
    kind: asString(row.type),
    name: asString(row.name),
    institution: asString(row.institution),
    mask: asString(row.mask),
    balance_cents: toCents(asNumberOrString(row.balance)),
    on_budget: asBool(row.on_budget),
    closed: asBool(row.closed),
    created_at: asIsoDate(row.created_at),
  }
}

export function decorateCategory(rowIn: RowOrNull): {
  id: string
  name: string
  group: string
  group_name: string
  sort_order: number
  archived: boolean
} {
  const row = r(rowIn)
  const groupName = asStringOrNull(row.group_name) ?? 'Uncategorized'
  return {
    id: asString(row.id),
    name: asString(row.name),
    group: groupName,
    group_name: groupName,
    sort_order: asNumber(row.sort_order),
    archived: asBool(row.archived),
  }
}

export interface DecoratedTransaction {
  id: string
  account_id: string
  category_id: string | null
  payee: string
  category: string
  account_name: string
  posted_at: string
  date: string
  amount_cents: number
  type: string
  memo: string
  cleared: boolean
}

/**
 * Decorate a list of transactions, joining in account name + category
 * name from the user's catalog. We do the lookup once for the whole
 * batch so we don't N+1 the database.
 */
export async function decorateTransactionsForUser(
  rows: Row[],
  userId: string,
): Promise<DecoratedTransaction[]> {
  if (rows.length === 0) return []
  const accountIds = Array.from(new Set(rows.map((r) => asString(r.account_id)).filter(Boolean)))
  const categoryIds = Array.from(
    new Set(rows.map((r) => asStringOrNull(r.category_id)).filter((s): s is string => Boolean(s))),
  )
  const userScope: WhereCondition = { field: 'user_id', operator: '=', value: userId }
  const [accounts, categories] = await Promise.all([
    accountIds.length > 0
      ? findMany('budget_accounts', {
          where: [userScope, { field: 'id', operator: 'in', value: accountIds }],
        })
      : Promise.resolve([] as Row[]),
    categoryIds.length > 0
      ? findMany('budget_categories', {
          where: [userScope, { field: 'id', operator: 'in', value: categoryIds }],
        })
      : Promise.resolve([] as Row[]),
  ])
  const accountById = new Map(accounts.map((a) => [asString(a.id), a]))
  const categoryById = new Map(categories.map((c) => [asString(c.id), c]))
  return rows.map((r) => decorateTransactionWith(r, accountById, categoryById))
}

function decorateTransactionWith(
  r: Row,
  accountById: Map<string, Row>,
  categoryById: Map<string, Row>,
): DecoratedTransaction {
  const accountId = asString(r.account_id)
  const categoryId = asStringOrNull(r.category_id)
  const account = accountById.get(accountId)
  const category = categoryId ? categoryById.get(categoryId) : null
  const amountCents = toCents(asNumberOrString(r.amount))
  const isoDate = asIsoDate(r.date) ?? new Date().toISOString()
  const txType = asStringOrNull(r.type)
  return {
    id: asString(r.id),
    account_id: accountId,
    category_id: categoryId,
    payee: asString(r.payee),
    category:
      asStringOrNull(category?.name) ??
      (txType === 'transfer' ? 'Transfer' : amountCents >= 0 ? 'Income' : 'Uncategorized'),
    account_name: asString(account?.name),
    posted_at: isoDate,
    date: isoDate,
    amount_cents: amountCents,
    type: txType ?? (amountCents >= 0 ? 'inflow' : 'outflow'),
    memo: asString(r.memo),
    cleared: asBool(r.cleared),
  }
}

export function decorateGoal(
  rowIn: RowOrNull,
  categoryName?: string | null,
): {
  id: string
  name: string
  category_id: string | null
  category_name: string | null
  target_cents: number
  saved_cents: number
  monthly_contribution_cents: number
  target_date: string | null
  status: string
  icon: string | null
  color: string | null
} {
  const row = r(rowIn)
  return {
    id: asString(row.id),
    name: asString(row.name),
    category_id: asStringOrNull(row.category_id),
    category_name: categoryName ?? null,
    target_cents: toCents(asNumberOrString(row.target_amount)),
    saved_cents: toCents(asNumberOrString(row.saved_amount)),
    monthly_contribution_cents: toCents(asNumberOrString(row.monthly_contribution)),
    target_date: asIsoDate(row.target_date),
    status: asString(row.status) || 'active',
    icon: asStringOrNull(row.icon),
    color: asStringOrNull(row.color),
  }
}

export async function decorateGoalsForUser(
  rows: Row[],
  userId: string,
): Promise<
  {
    id: string
    name: string
    category_id: string | null
    category_name: string | null
    target_cents: number
    saved_cents: number
    monthly_contribution_cents: number
    target_date: string | null
    status: string
    icon: string | null
    color: string | null
  }[]
> {
  if (rows.length === 0) return []
  const categoryIds = Array.from(
    new Set(rows.map((r) => asStringOrNull(r.category_id)).filter((s): s is string => Boolean(s))),
  )
  const categories =
    categoryIds.length > 0
      ? await findMany('budget_categories', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'id', operator: 'in', value: categoryIds },
          ],
        })
      : []
  const byId = new Map(categories.map((c) => [asString(c.id), asString(c.name)]))
  return rows.map((r) => {
    const cid = asStringOrNull(r.category_id)
    return decorateGoal(r, cid ? (byId.get(cid) ?? null) : null)
  })
}
