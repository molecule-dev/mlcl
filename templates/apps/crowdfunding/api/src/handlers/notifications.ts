import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

function fail(res: Response, error: unknown): void {
  logger.error(error)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

interface Notification {
  id: string
  kind: 'pledge_received' | 'pledge_made' | 'campaign_funded' | 'campaign_update'
  title: string
  body: string
  campaign_id: string
  campaign_title: string
  actor_name: string | null
  amount?: number
  read: boolean
  created_at: string
}

/**
 * Notifications are derived from existing rows (pledges, campaign_updates,
 * campaign status transitions) rather than persisted in their own table.
 * That keeps the schema small and means notifications never get out of
 * sync with the underlying events.
 *
 * The "read/unread" state is derived from a per-user `last_seen_at`
 * timestamp stored on the user row (oauthData JSON blob, since there is
 * no dedicated column). On GET we update that timestamp; subsequent
 * requests show all rows as read until a new event happens.
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const user = await findById<Record<string, unknown>>('users', userId)
    const oauthData = (user?.oauthData ?? {}) as Record<string, unknown>
    const lastSeen = oauthData?.notificationsSeenAt
      ? new Date(String(oauthData.notificationsSeenAt))
      : new Date(0)

    const notifications: Notification[] = []

    const myCampaigns = await findMany<Record<string, unknown>>('campaigns', {
      where: [{ field: 'creator_id', operator: '=', value: userId }],
    })
    const campaignById = new Map(myCampaigns.map((c) => [String(c.id), c]))

    for (const c of myCampaigns) {
      const pledges = await findMany<Record<string, unknown>>('pledges', {
        where: [{ field: 'campaign_id', operator: '=', value: String(c.id) }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 25,
      })
      for (const p of pledges) {
        const backer = await findById<Record<string, unknown>>('users', String(p.backer_id))
        const backerName = backer?.name
          ? String(backer.name)
          : backer?.email
            ? String(backer.email).split('@')[0]
            : 'A backer'
        const created = p.created_at ? new Date(p.created_at as string | Date) : new Date()
        notifications.push({
          id: `pledge_in_${String(p.id)}`,
          kind: 'pledge_received',
          title: `${backerName} backed your campaign`,
          body: `New pledge of $${Number(p.amount).toFixed(2)} on "${String(c.title)}"`,
          campaign_id: String(c.id),
          campaign_title: String(c.title),
          actor_name: backerName,
          amount: Number(p.amount),
          read: created < lastSeen,
          created_at: created.toISOString(),
        })
      }

      if (c.status === 'funded') {
        const updated = c.updated_at ? new Date(c.updated_at as string | Date) : new Date()
        notifications.push({
          id: `funded_${String(c.id)}`,
          kind: 'campaign_funded',
          title: 'Your campaign hit its goal',
          body: `"${String(c.title)}" reached $${Number(c.raised_amount).toFixed(2)} of its $${Number(c.goal_amount).toFixed(2)} goal`,
          campaign_id: String(c.id),
          campaign_title: String(c.title),
          actor_name: null,
          read: updated < lastSeen,
          created_at: updated.toISOString(),
        })
      }
    }

    const myPledges = await findMany<Record<string, unknown>>('pledges', {
      where: [{ field: 'backer_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 50,
    })
    const pledgedCampaignIds = Array.from(new Set(myPledges.map((p) => String(p.campaign_id))))
    for (const cid of pledgedCampaignIds) {
      const c = campaignById.get(cid) ?? (await findById<Record<string, unknown>>('campaigns', cid))
      if (!c) continue
      const updates = await findMany<Record<string, unknown>>('campaign_updates', {
        where: [{ field: 'campaign_id', operator: '=', value: cid }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 5,
      })
      for (const u of updates) {
        const created = u.created_at ? new Date(u.created_at as string | Date) : new Date()
        notifications.push({
          id: `update_${String(u.id)}`,
          kind: 'campaign_update',
          title: `New update on "${String(c.title)}"`,
          body: String(u.title),
          campaign_id: cid,
          campaign_title: String(c.title),
          actor_name: null,
          read: created < lastSeen,
          created_at: created.toISOString(),
        })
      }
    }

    notifications.sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    const unreadCount = notifications.filter((n) => !n.read).length

    res.json({ notifications: notifications.slice(0, 50), unread_count: unreadCount })
  } catch (error) {
    fail(res, error)
  }
})

router.post('/mark-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    const oauthData = (user?.oauthData ?? {}) as Record<string, unknown>
    const next = { ...oauthData, notificationsSeenAt: new Date().toISOString() }
    const { updateById } = await import('@molecule/api-database')
    await updateById('users', userId, { oauthData: next, updatedAt: new Date().toISOString() })
    res.json({ success: true })
  } catch (error) {
    fail(res, error)
  }
})

export default router
