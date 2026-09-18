/**
 * Personal-finance derived notifications.
 *
 * There is no `notifications` table — this resource derives a small set of
 * actionable alerts from existing data per request:
 *
 *  - **budget_exceeded**     — current-month spend in a category is at or
 *                              over the user's budget for that category.
 *  - **budget_at_risk**      — current-month spend is ≥ 80% of the budget
 *                              but not yet over.
 *  - **goal_milestone**      — a goal's `current_amount` reached 50%, 75%,
 *                              or 100% of its `target_amount`.
 *  - **low_account_balance** — an account balance dropped below $100.
 *  - **large_transaction**   — a single expense in the last 30 days was
 *                              ≥ $1,000.
 *
 * The shape is `{ id, type, title, body, severity, link, ts }` so the UI
 * can render a flat list and link each card to the source entity. The
 * derivation is recomputed on every GET — there is no read-flag and no
 * persisted state, which is fine for a flagship surfacing-of-truth view
 * (a real production app would persist read-state per row).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

type Severity = 'info' | 'warning' | 'critical' | 'success'

interface NotificationItem {
  id: string
  type:
    | 'budget_exceeded'
    | 'budget_at_risk'
    | 'goal_milestone'
    | 'low_account_balance'
    | 'large_transaction'
  title: string
  body: string
  severity: Severity
  link: string
  ts: string
}

interface BudgetRow {
  id: string
  user_id: string
  category_id: string
  amount: string | number
  month: number
  year: number
}

interface GoalRow {
  id: string
  user_id: string
  name: string
  target_amount: string | number
  current_amount: string | number
}

interface AccountRow {
  id: string
  user_id: string
  name: string
  balance: string | number
}

interface CategoryRow {
  id: string
  user_id: string
  name: string
}

interface TransactionRow {
  id: string
  user_id: string
  account_id: string | null
  category_id: string | null
  amount: string | number
  type: 'income' | 'expense' | 'transfer'
  description: string
  date: string | Date
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v ?? 0))

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const now = new Date()
  const month = now.getUTCMonth() + 1
  const year = now.getUTCFullYear()
  const monthStart = new Date(Date.UTC(year, now.getUTCMonth(), 1))

  const [budgets, goals, accounts, categories, recentTxns, monthSpendRows] = await Promise.all([
    findMany<BudgetRow>('budgets', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'month', operator: '=', value: month },
        { field: 'year', operator: '=', value: year },
      ],
    }),
    findMany<GoalRow>('goals', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findMany<AccountRow>('accounts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findMany<CategoryRow>('categories', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findMany<TransactionRow>('transactions', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'type', operator: '=', value: 'expense' },
        {
          field: 'date',
          operator: '>=',
          value: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      ],
      orderBy: [{ field: 'date', direction: 'desc' }],
      limit: 200,
    }),
    query<{ category_id: string; total: string | number }>(
      `SELECT category_id, COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND category_id IS NOT NULL
         AND date >= $2
       GROUP BY category_id`,
      [userId, monthStart.toISOString()],
    ).then((r) => r.rows),
  ])

  const categoryName = (id: string | null): string => {
    if (!id) return 'Uncategorized'
    const c = categories.find((x) => x.id === id)
    return c?.name ?? 'Uncategorized'
  }

  const items: NotificationItem[] = []

  // Budget alerts (exceeded / at-risk)
  const spendByCat = new Map<string, number>()
  for (const row of monthSpendRows) {
    spendByCat.set(row.category_id, num(row.total))
  }
  for (const b of budgets) {
    const spent = spendByCat.get(b.category_id) ?? 0
    const limit = num(b.amount)
    if (limit <= 0) continue
    const ratio = spent / limit
    const cat = categoryName(b.category_id)
    if (ratio >= 1) {
      items.push({
        id: `budget_exceeded:${b.id}`,
        type: 'budget_exceeded',
        title: t(
          'notifications.budgetExceededTitle',
          { category: cat },
          {
            defaultValue: '{{category}} budget exceeded',
          },
        ),
        body: t(
          'notifications.budgetExceededBody',
          { spent: spent.toFixed(2), limit: limit.toFixed(2) },
          { defaultValue: 'You have spent ${{spent}} of your ${{limit}} budget this month.' },
        ),
        severity: 'critical',
        link: '/budgets',
        ts: monthStart.toISOString(),
      })
    } else if (ratio >= 0.8) {
      items.push({
        id: `budget_at_risk:${b.id}`,
        type: 'budget_at_risk',
        title: t(
          'notifications.budgetAtRiskTitle',
          { category: cat },
          {
            defaultValue: '{{category}} budget at risk',
          },
        ),
        body: t(
          'notifications.budgetAtRiskBody',
          { pct: Math.round(ratio * 100), limit: limit.toFixed(2) },
          {
            defaultValue:
              'You have used {{pct}}% of your ${{limit}} budget this month — slow down to stay under.',
          },
        ),
        severity: 'warning',
        link: '/budgets',
        ts: monthStart.toISOString(),
      })
    }
  }

  // Goal milestones
  for (const g of goals) {
    const target = num(g.target_amount)
    const current = num(g.current_amount)
    if (target <= 0) continue
    const ratio = current / target
    let pct: 100 | 75 | 50 | null = null
    if (ratio >= 1) pct = 100
    else if (ratio >= 0.75) pct = 75
    else if (ratio >= 0.5) pct = 50
    if (pct == null) continue
    items.push({
      id: `goal_milestone:${g.id}:${pct}`,
      type: 'goal_milestone',
      title: t(
        'notifications.goalMilestoneTitle',
        { goal: g.name, pct },
        { defaultValue: '{{goal}} reached {{pct}}%' },
      ),
      body: t(
        'notifications.goalMilestoneBody',
        { current: current.toFixed(2), target: target.toFixed(2) },
        { defaultValue: '${{current}} of ${{target}} saved — keep going!' },
      ),
      severity: pct === 100 ? 'success' : 'info',
      link: '/goals',
      ts: now.toISOString(),
    })
  }

  // Low account balance (< $100)
  for (const a of accounts) {
    const bal = num(a.balance)
    if (bal < 100 && bal >= 0) {
      items.push({
        id: `low_account_balance:${a.id}`,
        type: 'low_account_balance',
        title: t(
          'notifications.lowAccountTitle',
          { name: a.name },
          { defaultValue: 'Low balance on {{name}}' },
        ),
        body: t(
          'notifications.lowAccountBody',
          { name: a.name, balance: bal.toFixed(2) },
          { defaultValue: '{{name}} has only ${{balance}} remaining.' },
        ),
        severity: 'warning',
        link: `/accounts/${a.id}`,
        ts: now.toISOString(),
      })
    }
  }

  // Large transactions (≥ $1000) in last 30 days
  for (const tx of recentTxns) {
    const amount = Math.abs(num(tx.amount))
    if (amount < 1000) continue
    items.push({
      id: `large_transaction:${tx.id}`,
      type: 'large_transaction',
      title: t(
        'notifications.largeTransactionTitle',
        { amount: amount.toFixed(2) },
        { defaultValue: 'Large transaction: ${{amount}}' },
      ),
      body: tx.description,
      severity: 'info',
      link: `/transactions/${tx.id}`,
      ts:
        tx.date instanceof Date ? tx.date.toISOString() : new Date(tx.date as string).toISOString(),
    })
  }

  items.sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0))

  res.json({ data: items, count: items.length })
})

export default router
