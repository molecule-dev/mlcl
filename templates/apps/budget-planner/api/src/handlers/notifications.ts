/**
 * Derived notifications: not stored in their own table — generated on the
 * fly from the user's actual budget state (overspent envelopes, goal
 * milestones, recent recurring-payee transactions). Each notification has
 * a deterministic id derived from its source rows so re-rendering doesn't
 * shuffle them.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { toCents } from '../lib/decorate.js'

interface CategoryRow {
  id: string
  user_id: string
  name: string
  archived: boolean
}
interface TxRow {
  id: string
  user_id: string
  account_id: string
  category_id: string | null
  payee: string | null
  amount: string | number | null
  date: string | Date
}
interface EnvelopeRow {
  user_id: string
  category_id: string
  month: number
  year: number
  assigned: string | number | null
}
interface GoalRow {
  id: string
  user_id: string
  name: string
  target_amount: string | number | null
  saved_amount: string | number | null
  status: string
}

interface NotificationOut {
  id: string
  type:
    | 'budget_overspent'
    | 'goal_reached'
    | 'goal_milestone'
    | 'monthly_report'
    | 'recurring_due'
    | 'system_message'
  title: string
  body: string
  href: string | null
  created_at: string
  unread: boolean
}

const router = Router()

interface UserRow {
  id: string
  oauthData: Record<string, unknown> | null
}

async function readDismissed(userId: string): Promise<Set<string>> {
  const u = await findById<UserRow>('users', userId)
  const oauthData = (u?.oauthData ?? {}) as Record<string, unknown>
  const ids = Array.isArray(oauthData.dismissedNotifications)
    ? (oauthData.dismissedNotifications as string[])
    : []
  return new Set(ids)
}

async function persistDismissed(userId: string, dismissed: Set<string>): Promise<void> {
  const u = await findById<UserRow>('users', userId)
  const oauthData = (u?.oauthData ?? {}) as Record<string, unknown>
  await updateById('users', userId, {
    oauthData: { ...oauthData, dismissedNotifications: Array.from(dismissed) },
  })
}

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const dismissed = await readDismissed(userId)
  dismissed.add(id)
  await persistDismissed(userId, dismissed)
  res.json({ id, unread: false })
})

router.post('/read-all', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  // Re-derive every notification id and mark them all dismissed.
  const all = await deriveNotifications(userId)
  const dismissed = await readDismissed(userId)
  for (const n of all) dismissed.add(n.id)
  await persistDismissed(userId, dismissed)
  res.json({ marked: all.length })
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const dismissed = await readDismissed(userId)
  const out = await deriveNotifications(userId)
  for (const n of out) {
    if (dismissed.has(n.id)) n.unread = false
  }
  res.json(out)
})

async function deriveNotifications(userId: string): Promise<NotificationOut[]> {
  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59))

  const [categories, txs, envelopes, goals, user, accounts] = await Promise.all([
    findMany<CategoryRow>('budget_categories', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findMany<TxRow>('budget_transactions', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'date', operator: '>=', value: monthStart },
        { field: 'date', operator: '<=', value: monthEnd },
      ],
    }),
    findMany<EnvelopeRow>('envelopes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'month', operator: '=', value: now.getUTCMonth() + 1 },
        { field: 'year', operator: '=', value: now.getUTCFullYear() },
      ],
    }),
    findMany<GoalRow>('goals', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
    findById<UserRow>('users', userId),
    findMany<{ id: string; on_budget: boolean }>('budget_accounts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    }),
  ])

  // Honor the user's per-type alert toggles (set in Settings → stored in oauthData.preferences).
  // The engine previously emitted every alert unconditionally, so turning one off did nothing.
  // Defaults are on, so only an explicit `false` suppresses.
  const prefs = ((user?.oauthData ?? {}) as Record<string, unknown>).preferences as
    { notifyBudgetOverspent?: boolean; notifyGoalMilestones?: boolean } | undefined
  const notifyOverspent = prefs?.notifyBudgetOverspent !== false
  const notifyGoals = prefs?.notifyGoalMilestones !== false

  const categoryById = new Map(categories.map((c) => [c.id, c]))
  // Overspent alerts count only ON-budget accounts (tracking accounts excluded), matching reports.
  const offBudget = new Set(accounts.filter((a) => !a.on_budget).map((a) => a.id))
  const spentByCat = new Map<string, number>()
  for (const tx of txs) {
    if (offBudget.has(tx.account_id)) continue
    if (!tx.category_id) continue
    const cents = toCents(tx.amount)
    if (cents < 0) spentByCat.set(tx.category_id, (spentByCat.get(tx.category_id) ?? 0) + -cents)
  }
  const assignedByCat = new Map<string, number>()
  for (const e of envelopes) {
    assignedByCat.set(e.category_id, (assignedByCat.get(e.category_id) ?? 0) + toCents(e.assigned))
  }

  const out: NotificationOut[] = []

  // Overspent envelope notifications — suppressed when the user turned off overspend alerts.
  for (const [catId, spent] of notifyOverspent ? spentByCat : new Map<string, number>()) {
    const assigned = assignedByCat.get(catId) ?? 0
    if (spent > assigned && assigned > 0) {
      const cat = categoryById.get(catId)
      out.push({
        id: `overspent-${catId}-${monthStart.toISOString().slice(0, 7)}`,
        type: 'budget_overspent',
        title: t(
          'notifications.overspent.title',
          { name: cat?.name ?? 'Category' },
          {
            defaultValue: '{{name}} envelope is overspent',
          },
        ),
        body: t(
          'notifications.overspent.body',
          {
            spent: `$${(spent / 100).toFixed(2)}`,
            assigned: `$${(assigned / 100).toFixed(2)}`,
            name: cat?.name ?? 'Category',
          },
          {
            defaultValue: "You've spent {{spent}} of {{assigned}} in {{name}} this month.",
          },
        ),
        href: '/budget',
        created_at: monthStart.toISOString(),
        unread: true,
      })
    }
  }

  // Goal milestone / completion notifications — suppressed when the user turned off goal alerts.
  for (const goal of notifyGoals ? goals : []) {
    const target = toCents(goal.target_amount)
    const saved = toCents(goal.saved_amount)
    if (target <= 0) continue
    const pct = Math.floor((saved / target) * 100)
    if (saved >= target) {
      out.push({
        id: `goal-reached-${goal.id}`,
        type: 'goal_reached',
        title: t(
          'notifications.goalReached.title',
          { name: goal.name },
          {
            defaultValue: '{{name}} reached!',
          },
        ),
        body: t(
          'notifications.goalReached.body',
          { name: goal.name },
          {
            defaultValue: 'Congrats — {{name}} hit 100%.',
          },
        ),
        href: `/goals/${goal.id}`,
        created_at: now.toISOString(),
        unread: true,
      })
    } else if (pct >= 50 && pct < 100) {
      out.push({
        id: `goal-milestone-${goal.id}-${pct}`,
        type: 'goal_milestone',
        title: t(
          'notifications.goalMilestone.title',
          { pct, name: goal.name },
          {
            defaultValue: '{{pct}}% to {{name}}',
          },
        ),
        body: t(
          'notifications.goalMilestone.body',
          {
            saved: `$${(saved / 100).toFixed(2)}`,
            target: `$${(target / 100).toFixed(2)}`,
            name: goal.name,
          },
          {
            defaultValue: '{{saved}} of {{target}} saved for {{name}}. Keep going!',
          },
        ),
        href: `/goals/${goal.id}`,
        created_at: now.toISOString(),
        unread: true,
      })
    }
  }

  // Welcome message for new users with no activity
  if (txs.length === 0 && categories.length === 0) {
    out.push({
      id: `welcome-${userId}`,
      type: 'system_message',
      title: t('notifications.welcome.title', {}, { defaultValue: 'Welcome to Coffer' }),
      body: t(
        'notifications.welcome.body',
        {},
        {
          defaultValue: "Start by adding your accounts and importing your bank's CSV.",
        },
      ),
      href: '/import',
      created_at: now.toISOString(),
      unread: true,
    })
  }

  return out
}

export default router
