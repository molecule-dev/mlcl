/**
 * Account-balance recompute helper.
 *
 * The running `balance` column on `budget_accounts` is derived state:
 *   balance = opening_balance + Σ signed transaction amounts
 *
 * Transactions are stored with a *signed* amount in the DB (negative for
 * outflow, positive for inflow). The HTTP layer accepts either a signed
 * amount OR an unsigned amount + `type` ∈ {inflow, outflow, transfer},
 * and normalizes to signed before persisting.
 *
 * Without this helper, `recompute = sum(amount)` over outflow rows that
 * stored their amount as unsigned positive (legacy behavior) made the
 * account balance INCREASE on every spend. With both the signed-store
 * fix and this helper, account balance = opening + ledger every time.
 *
 * @module
 */

import { findMany, updateById } from '@molecule/api-database'

interface AccountRow {
  id: string
  opening_balance?: string | number | null
  balance?: string | number | null
}

interface TxRow {
  amount?: string | number | null
}

const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : 0
}

/**
 * Recompute and persist `budget_accounts.balance` for one account by
 * summing every signed transaction amount on top of the account's stored
 * `opening_balance`. Idempotent — call it after every transaction
 * create/update/delete and after any opening-balance correction.
 */
export async function applyOpeningBalanceRecompute(
  accountId: string,
  userId: string,
): Promise<void> {
  const accountRows = await findMany<AccountRow>('budget_accounts', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'id', operator: '=', value: accountId },
    ],
    limit: 1,
  })
  const account = accountRows[0]
  if (!account) return
  const opening = num(account.opening_balance)
  const txs = await findMany<TxRow>('budget_transactions', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'account_id', operator: '=', value: accountId },
    ],
  })
  const ledger = txs.reduce((acc, t) => acc + num(t.amount), 0)
  await updateById('budget_accounts', accountId, { balance: opening + ledger })
}

/**
 * Normalize a transaction's `amount` to a signed decimal based on its
 * `type`. Outflow → negative; inflow → positive; transfer keeps the
 * provided sign (the caller is asserting intent for one leg).
 */
export function signedAmount(
  amount: number,
  type: 'inflow' | 'outflow' | 'transfer' | undefined,
): number {
  const abs = Math.abs(amount)
  if (type === 'outflow') return -abs
  if (type === 'inflow') return abs
  // transfer or undefined: trust the sign as given
  return amount
}
