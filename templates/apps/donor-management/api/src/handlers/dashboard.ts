/**
 * Dashboard handler — the signed-in user's fundraising snapshot.
 *
 * GET /api/dashboard/summary returns:
 * - `raised_ytd_cents` — total gifts with a gift_date in the current year
 * - `donor_count`      — donors on file
 * - `gifts_ytd`        — number of gifts this year
 * - `avg_gift_cents`   — raised_ytd / gifts_ytd (0 when no gifts)
 * - `recent_gifts`     — the 8 most recent gifts with donor names
 * - `campaigns`        — every campaign with goal + derived raised-to-date,
 *                        for the progress bars
 *
 * Money is integer cents everywhere. All queries are owner-scoped.
 *
 * @module
 */

import { type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { authorizers } from '@molecule/api-resource-user'

import { seedDemoForUser } from './_seed.js'
import { asMap, shapeCampaign, shapeGift } from './_shape.js'

const router = Router()

/**
 * Calendar year of a gift_date cell, tolerant of the driver's shape.
 *
 * Postgres DATE columns arrive here as JS `Date` objects (local midnight),
 * so `String(v).slice(0, 4)` yields "Tue " — never the year — and every
 * gift silently failed the YTD bucket (dashboard showed $0 raised with a
 * fully seeded book). `getFullYear()` reads the LOCAL calendar, which is
 * the calendar the seed and the gift form write.
 */
const giftYear = (v: unknown): string => {
  const d = v instanceof Date ? v : new Date(String(v ?? ''))
  return Number.isNaN(d.getTime()) ? String(v ?? '').slice(0, 4) : String(d.getFullYear())
}

interface GiftRow {
  id?: string
  donor_id?: string
  amount_cents?: number
  gift_date?: unknown
  method?: string
  fund?: string
  campaign_id?: string | null
  receipt_id?: string | null
}

router.use(authorizers.auth())

router.get('/summary', async (_req, res: Response) => {
  const userId = res.locals.session.userId as string
  try {
    // Triggers the demo seed on first authenticated request so the dashboard
    // is never blank for a brand-new user (idempotent; failures don't block).
    await seedDemoForUser(userId)
    const currentYear = new Date().getFullYear()
    const [donors, campaigns, gifts] = await Promise.all([
      findMany<{ id?: string; name?: string }>('donors', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
        limit: 10000,
      }),
      findMany('campaigns', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 200,
      }),
      findMany<GiftRow>('gifts', {
        where: [{ field: 'owner_id', operator: '=', value: userId }],
        orderBy: [{ field: 'gift_date', direction: 'desc' }],
        limit: 5000,
      }),
    ])

    const yearGifts = gifts.filter((g) => giftYear(g.gift_date) === String(currentYear))
    const raisedYtd = yearGifts.reduce((sum, g) => sum + Number(g.amount_cents ?? 0), 0)
    const avgGift = yearGifts.length > 0 ? Math.round(raisedYtd / yearGifts.length) : 0

    // Campaign raised-to-date derived from the same gift list.
    const raisedByCampaign = new Map<string, { cents: number; count: number }>()
    for (const g of gifts) {
      const cid = typeof g.campaign_id === 'string' ? g.campaign_id : ''
      if (!cid) continue
      const prev = raisedByCampaign.get(cid) ?? { cents: 0, count: 0 }
      prev.cents += Number(g.amount_cents ?? 0)
      prev.count += 1
      raisedByCampaign.set(cid, prev)
    }

    const nameMap = asMap(
      donors.map((d) => ({ id: String(d.id), name: String(d.name ?? '') })),
      'id',
    )

    const recent = gifts
      .slice(0, 8)
      .map((g) =>
        shapeGift(g as Record<string, unknown>, nameMap.get(String(g.donor_id))?.name ?? ''),
      )

    res.json({
      year: currentYear,
      raised_ytd_cents: raisedYtd,
      donor_count: donors.length,
      gifts_ytd: yearGifts.length,
      avg_gift_cents: avgGift,
      recent_gifts: recent,
      campaigns: campaigns.map((c) => {
        const r = raisedByCampaign.get(String(c.id))
        return shapeCampaign(c as Record<string, unknown>, r?.cents ?? 0, r?.count ?? 0)
      }),
    })
  } catch (err) {
    logger.error('[dashboard] summary failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
