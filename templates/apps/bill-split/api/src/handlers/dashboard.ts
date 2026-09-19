/**
 * Dashboard handler — the signed-in user's cross-group money position.
 *
 * GET /api/dashboard/summary returns:
 * - `you_owe_cents`    — sum of the user's negative group nets (money to pay out)
 * - `you_are_owed_cents` — sum of the positive group nets (money to collect)
 * - per-group rows with the user's net in each
 * - per-friend nets aggregated across every group (the Balances page data)
 * - the most recent activities for the feed
 *
 * Money is integer cents everywhere.
 *
 * @module
 */

import { type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { computeGroupBalances } from './_balances.js'
import { seedDemoForUser } from './_seed.js'
import { listGroupMembers, listGroups } from './groups.js'

const router = Router()

interface ActivityRow {
  id?: string
  group_id?: string
  kind?: string
  payload?: Record<string, unknown> | null
  created_at?: string | Date | null
}

router.get('/summary', async (_req, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }

  // Triggers the demo seed on first authenticated request so the dashboard
  // is never blank for a brand-new user (idempotent; failures don't block).
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }

  const groups = await listGroups(userId)

  let youOweCents = 0
  let youAreOwedCents = 0
  const groupRows: Record<string, unknown>[] = []
  // friend_id -> aggregated net + name
  const friendNets = new Map<string, { name: string; net_cents: number; is_self: boolean }>()

  for (const g of groups) {
    const members = await listGroupMembers(g.id!)
    const balances = await computeGroupBalances(g.id!, members)
    for (const b of balances) {
      const existing = friendNets.get(b.member_id)
      if (existing) {
        existing.net_cents += b.net_cents
      } else {
        friendNets.set(b.member_id, {
          name: b.name,
          net_cents: b.net_cents,
          is_self: b.is_self,
        })
      }
    }
    const mine = balances.find((b) => b.is_self)
    const myNet = mine ? mine.net_cents : 0
    if (myNet < 0) youOweCents += -myNet
    if (myNet > 0) youAreOwedCents += myNet
    groupRows.push({
      id: g.id,
      name: g.name,
      member_count: members.length,
      my_balance_cents: myNet,
      total_expenses_cents: balances.reduce((sum, b) => sum + b.paid_cents, 0),
    })
  }

  const recentActivities = await findMany<ActivityRow>('activities', {
    where: [{ field: 'group_id', operator: 'in', value: groups.map((g) => g.id!) }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 8,
  })
  const groupNames = new Map(groups.map((g) => [g.id as string, g.name ?? 'Group']))

  const friends = [...friendNets.values()]
    .filter((f) => !f.is_self)
    .sort((a, b) => a.net_cents - b.net_cents) // biggest debtor first

  res.json({
    you_owe_cents: youOweCents,
    you_are_owed_cents: youAreOwedCents,
    groups: groupRows,
    friends,
    recent_activities: recentActivities.map((a) => ({
      id: a.id,
      group_id: a.group_id,
      group_name: groupNames.get(a.group_id ?? '') ?? '',
      kind: a.kind ?? 'unknown',
      payload: a.payload ?? {},
      created_at:
        a.created_at instanceof Date ? a.created_at.toISOString() : (a.created_at ?? null),
    })),
  })
})

export default router
