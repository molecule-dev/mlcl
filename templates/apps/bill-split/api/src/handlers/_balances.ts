/**
 * Balance + simplify-debts engine for bill-split.
 *
 * Balances are INTEGER CENTS. For every member of a group:
 *
 *   net = paid (expenses they paid for)
 *       - owed (sum of their expense_shares)
 *       + sent (settlements they paid out — paying a debt back REDUCES it)
 *       - received (settlements paid to them — getting repaid SETTLES credit)
 *
 * net > 0 → the group owes this member money.
 * net < 0 → this member owes the group money.
 * Every group's nets always sum to exactly 0 (each expense's shares sum to
 * its amount and every settlement is a +from/-to pair), which is what makes
 * the greedy min-transfer simplification exact, not approximate.
 *
 * @module
 */

import { findMany } from '@molecule/api-database'

export interface MemberRow {
  id?: string
  user_id?: string
  name?: string
  email?: string | null
  is_self?: boolean
}

export interface ExpenseRowLite {
  id?: string
  group_id?: string
  payer_member_id?: string
  amount_cents?: number | string
}

export interface ExpenseShareRow {
  expense_id?: string
  member_id?: string
  amount_cents?: number | string
}

export interface SettlementRowLite {
  id?: string
  group_id?: string
  from_member_id?: string
  to_member_id?: string
  amount_cents?: number | string
}

export interface Transfer {
  from_member_id: string
  to_member_id: string
  amount_cents: number
}

export interface MemberBalance {
  member_id: string
  name: string
  is_self: boolean
  paid_cents: number
  owed_cents: number
  sent_cents: number
  received_cents: number
  net_cents: number
}

function toCents(value: number | string | undefined | null): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** Compute per-member balances for one group. */
export async function computeGroupBalances(
  groupId: string,
  members: MemberRow[],
): Promise<MemberBalance[]> {
  const expenses = await findMany<ExpenseRowLite>('expenses', {
    where: [{ field: 'group_id', operator: '=', value: groupId }],
    limit: 10000,
  })
  const expenseIds = expenses.map((e) => e.id!)
  const shares = expenseIds.length
    ? await findMany<ExpenseShareRow>('expense_shares', {
        where: [{ field: 'expense_id', operator: 'in', value: expenseIds }],
        limit: 100000,
      })
    : []
  const settlements = await findMany<SettlementRowLite>('settlements', {
    where: [{ field: 'group_id', operator: '=', value: groupId }],
    limit: 10000,
  })

  const state = new Map<string, MemberBalance>()
  for (const m of members) {
    state.set(m.id!, {
      member_id: m.id!,
      name: m.name ?? 'Member',
      is_self: m.is_self === true,
      paid_cents: 0,
      owed_cents: 0,
      sent_cents: 0,
      received_cents: 0,
      net_cents: 0,
    })
  }

  for (const e of expenses) {
    const payer = e.payer_member_id
    if (payer && state.has(payer)) {
      state.get(payer)!.paid_cents += toCents(e.amount_cents)
    }
  }
  for (const s of shares) {
    const member = s.member_id
    if (member && state.has(member)) {
      state.get(member)!.owed_cents += toCents(s.amount_cents)
    }
  }
  for (const s of settlements) {
    const from = s.from_member_id
    const to = s.to_member_id
    const cents = toCents(s.amount_cents)
    if (from && state.has(from)) state.get(from)!.sent_cents += cents
    if (to && state.has(to)) state.get(to)!.received_cents += cents
  }

  for (const b of state.values()) {
    // A settlement the member SENT pays down what they owe (+sent toward
    // zero); a settlement they RECEIVED collects credit owed to them
    // (-received toward zero). Flipping these signs double-counts settled
    // debt and makes a fully-repaid group look like it owes more than
    // before anyone paid (caught by the settle-up e2e flow).
    b.net_cents = b.paid_cents - b.owed_cents + b.sent_cents - b.received_cents
  }
  return [...state.values()]
}

/**
 * Greedy min-cash-flow simplification: repeatedly match the largest debtor
 * against the largest creditor. Exact because nets sum to zero — the last
 * transfer always clears both sides at once.
 */
export function simplifyDebts(balances: MemberBalance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.net_cents < 0)
    .map((b) => ({ id: b.member_id, remaining: -b.net_cents }))
    .sort((a, b) => b.remaining - a.remaining)
  const creditors = balances
    .filter((b) => b.net_cents > 0)
    .map((b) => ({ id: b.member_id, remaining: b.net_cents }))
    .sort((a, b) => b.remaining - a.remaining)

  const transfers: Transfer[] = []
  let d = 0
  let c = 0
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d]
    const creditor = creditors[c]
    const amount = Math.min(debtor.remaining, creditor.remaining)
    if (amount > 0) {
      transfers.push({
        from_member_id: debtor.id,
        to_member_id: creditor.id,
        amount_cents: amount,
      })
    }
    debtor.remaining -= amount
    creditor.remaining -= amount
    if (debtor.remaining <= 0) d += 1
    if (creditor.remaining <= 0) c += 1
  }
  return transfers
}
