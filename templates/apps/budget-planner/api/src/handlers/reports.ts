import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { toCents } from '../lib/decorate.js'

interface AccountRow {
  id: string
  user_id: string
  name: string
  balance: string | number | null
  on_budget: boolean
  closed: boolean
}

interface CategoryRow {
  id: string
  user_id: string
  name: string
  group_name: string | null
  archived: boolean
}

interface TxRow {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  payee: string | null
  amount: string | number | null
  type: string | null
  date: string | Date
}

interface EnvelopeRow {
  user_id: string
  category_id: string
  month: number
  year: number
  assigned: string | number | null
}

const router = Router()

const monthQuerySchema = z.object({
  month: z.string().optional(),
})

function monthRangeFromString(month?: string): {
  startDate: Date
  endDate: Date
  year: number
  m: number
  iso: string
} {
  const now = new Date()
  let year = now.getUTCFullYear()
  let m = now.getUTCMonth() + 1
  if (month) {
    const [y, mm] = month.split('-').map(Number)
    if (Number.isFinite(y) && Number.isFinite(mm)) {
      year = y
      m = mm
    }
  }
  const startDate = new Date(Date.UTC(year, m - 1, 1, 0, 0, 0))
  const endDate = new Date(Date.UTC(year, m, 0, 23, 59, 59))
  const iso = `${year}-${String(m).padStart(2, '0')}`
  return { startDate, endDate, year, m, iso }
}

async function loadMonthData(userId: string, startDate: Date, endDate: Date): Promise<TxRow[]> {
  const txs = await findMany<TxRow>('budget_transactions', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '>=', value: startDate },
      { field: 'date', operator: '<=', value: endDate },
    ],
  })
  return txs
}

router.get(
  '/month_summary',
  validateQuery(monthQuerySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { startDate, endDate, m, year, iso } = monthRangeFromString(
      req.query.month as string | undefined,
    )
    const [txs, envelopes, accounts, last30Txs] = await Promise.all([
      loadMonthData(userId, startDate, endDate),
      findMany<EnvelopeRow>('envelopes', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'month', operator: '=', value: m },
          { field: 'year', operator: '=', value: year },
        ],
      }),
      findMany<AccountRow>('budget_accounts', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      findMany<TxRow>('budget_transactions', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'date', operator: '>=', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        ],
      }),
    ])

    // Budget income/spending counts only transactions in ON-budget accounts — off-budget (tracking)
    // accounts like investments/loans must not pollute the budget totals. Net worth (below) still
    // includes every account.
    const offBudget = new Set(accounts.filter((a) => !a.on_budget).map((a) => a.id))
    const budgetTxs = txs.filter((tx) => !offBudget.has(tx.account_id))
    let income = 0
    let spent = 0
    for (const tx of budgetTxs) {
      const cents = toCents(tx.amount)
      if (cents >= 0) income += cents
      else spent += -cents
    }
    const assigned = envelopes.reduce((acc, e) => acc + toCents(e.assigned), 0)
    const available = income - assigned
    const netWorth = accounts.reduce((acc, a) => acc + toCents(a.balance), 0)
    const last30Net = last30Txs.reduce((acc, t) => acc + toCents(t.amount), 0)

    res.json({
      month: iso,
      income_cents: income,
      assigned_cents: assigned,
      spent_cents: spent,
      available_cents: available,
      net_worth_cents: netWorth,
      net_worth_change_30d_cents: last30Net,
    })
  },
)

router.get(
  '/category_progress',
  validateQuery(monthQuerySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const { startDate, endDate, m, year } = monthRangeFromString(
      req.query.month as string | undefined,
    )
    const [txs, envelopes, categories, accounts] = await Promise.all([
      loadMonthData(userId, startDate, endDate),
      findMany<EnvelopeRow>('envelopes', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'month', operator: '=', value: m },
          { field: 'year', operator: '=', value: year },
        ],
      }),
      findMany<CategoryRow>('budget_categories', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
      findMany<AccountRow>('budget_accounts', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      }),
    ])

    // Category spending counts only ON-budget accounts (off-budget/tracking excluded).
    const offBudget = new Set(accounts.filter((a) => !a.on_budget).map((a) => a.id))
    const spentByCategory = new Map<string, number>()
    for (const tx of txs) {
      if (offBudget.has(tx.account_id)) continue
      if (!tx.category_id) continue
      const cents = toCents(tx.amount)
      if (cents < 0) {
        spentByCategory.set(tx.category_id, (spentByCategory.get(tx.category_id) ?? 0) + -cents)
      }
    }
    const assignedByCategory = new Map<string, number>()
    for (const e of envelopes) {
      assignedByCategory.set(
        e.category_id,
        (assignedByCategory.get(e.category_id) ?? 0) + toCents(e.assigned),
      )
    }
    const rows = categories
      .filter((c) => !c.archived)
      .map((c) => ({
        category_id: c.id,
        category_name: c.name,
        group: c.group_name ?? 'Uncategorized',
        assigned_cents: assignedByCategory.get(c.id) ?? 0,
        spent_cents: spentByCategory.get(c.id) ?? 0,
      }))
    res.json(rows)
  },
)

router.get('/full', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [allRecent, accounts, categories] = await Promise.all([
    findMany<TxRow>('budget_transactions', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'date', operator: '>=', value: sixMonthsAgo },
      ],
      orderBy: [{ field: 'date', direction: 'asc' }],
    }),
    findMany<AccountRow>('budget_accounts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findMany<CategoryRow>('budget_categories', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
  ])

  const categoryById = new Map(categories.map((c) => [c.id, c]))

  // Budget reports (income/expenses, category spending, payees) count only ON-budget accounts;
  // net-worth history (below) still spans every account.
  const offBudget = new Set(accounts.filter((a) => !a.on_budget).map((a) => a.id))
  const budgetRecent = allRecent.filter((tx) => !offBudget.has(tx.account_id))

  // Monthly income vs expenses for the past 6 months.
  const monthBuckets = new Map<string, { income: number; expenses: number }>()
  for (const tx of budgetRecent) {
    const d = tx.date instanceof Date ? tx.date : new Date(tx.date)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const cents = toCents(tx.amount)
    const bucket = monthBuckets.get(key) ?? { income: 0, expenses: 0 }
    if (cents >= 0) bucket.income += cents
    else bucket.expenses += -cents
    monthBuckets.set(key, bucket)
  }
  const income_vs_expenses = Array.from(monthBuckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, b]) => ({
      month,
      income_cents: b.income,
      expenses_cents: b.expenses,
    }))

  // Spending by category over the past 30 days.
  const spendingMap = new Map<string, number>()
  for (const tx of budgetRecent) {
    const d = tx.date instanceof Date ? tx.date : new Date(tx.date)
    if (d < last30) continue
    const cents = toCents(tx.amount)
    if (cents >= 0) continue
    const cat = (tx.category_id && categoryById.get(tx.category_id)?.name) || 'Uncategorized'
    spendingMap.set(cat, (spendingMap.get(cat) ?? 0) + -cents)
  }
  const spending_by_category_30d = Array.from(spendingMap.entries())
    .map(([category, amountCents]) => ({ category, amount_cents: amountCents }))
    .sort((a, b) => b.amount_cents - a.amount_cents)

  // Top payees over the past 30 days.
  const payeeMap = new Map<string, { spent: number; count: number }>()
  for (const tx of budgetRecent) {
    const d = tx.date instanceof Date ? tx.date : new Date(tx.date)
    if (d < last30) continue
    const cents = toCents(tx.amount)
    if (cents >= 0) continue
    const key = tx.payee ?? 'Unknown'
    const bucket = payeeMap.get(key) ?? { spent: 0, count: 0 }
    bucket.spent += -cents
    bucket.count += 1
    payeeMap.set(key, bucket)
  }
  const top_payees_30d = Array.from(payeeMap.entries())
    .map(([payee, b]) => ({ payee, spent_cents: b.spent, transaction_count: b.count }))
    .sort((a, b) => b.spent_cents - a.spent_cents)
    .slice(0, 10)

  // Net-worth history: cumulative sum of all transactions per day in the
  // past 90 days, anchored to the current account total.
  const totalNow = accounts.reduce((acc, a) => acc + toCents(a.balance), 0)
  const txInRange = allRecent
    .filter((tx) => {
      const d = tx.date instanceof Date ? tx.date : new Date(tx.date)
      return d >= ninetyDaysAgo
    })
    .map((tx) => ({
      date: tx.date instanceof Date ? tx.date : new Date(tx.date),
      cents: toCents(tx.amount),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  const futureNet = txInRange.reduce((acc, t) => acc + t.cents, 0)
  let runningPast = totalNow - futureNet
  const dailyMap = new Map<string, number>()
  for (const t of txInRange) {
    runningPast += t.cents
    const k = t.date.toISOString().slice(0, 10)
    dailyMap.set(k, runningPast)
  }
  const net_worth_history = Array.from(dailyMap.entries()).map(([date, netWorthCents]) => ({
    date,
    net_worth_cents: netWorthCents,
  }))
  // If there's no transaction history we still want a single anchor point
  // so the chart renders something.
  if (net_worth_history.length === 0) {
    net_worth_history.push({
      date: new Date().toISOString().slice(0, 10),
      net_worth_cents: totalNow,
    })
  }

  res.json({
    spending_by_category_30d,
    top_payees_30d,
    income_vs_expenses,
    net_worth_history,
  })
})

export default router
