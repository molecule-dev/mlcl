import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const dashboardSchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
})

function asISO(value: unknown): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

router.get(
  '/dashboard_stats',
  validateQuery(dashboardSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized') })
      return
    }
    // Scope the whole dashboard to the requested date range — the from/to picker was validated
    // then ignored (the handler never read req.query), so every range showed all-time stats.
    const { from, to } = req.query as unknown as z.infer<typeof dashboardSchema>

    try {
      await seedDemoForUser(userId)
    } catch (_error) {
      // Seeding is best-effort; never block dashboard render on it.
    }

    const redemptionsWhere: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (from)
      redemptionsWhere.push({ field: 'purchased_at', operator: '>=', value: new Date(from) })
    if (to) redemptionsWhere.push({ field: 'purchased_at', operator: '<=', value: new Date(to) })

    const redemptions = await findMany<Record<string, unknown>>('redemptions', {
      where: redemptionsWhere,
      orderBy: [{ field: 'purchased_at', direction: 'desc' }],
      limit: 500,
    })

    const now = Date.now()
    const sevenDays = 7 * 24 * 60 * 60 * 1000

    const totalSavings = redemptions.reduce((sum, r) => sum + Number(r.savings_cents ?? 0), 0)
    const savedCount = redemptions.length
    const redeemedCount = redemptions.filter((r) => r.status === 'redeemed').length
    const expiringCount = redemptions.filter((r) => {
      if (r.status === 'redeemed') return false
      const exp = r.expires_at as string | Date | null
      if (!exp) return false
      const t = new Date(exp as string).getTime()
      return t > now && t - now < sevenDays
    }).length

    const merchantTotals = new Map<string, { name: string; savings: number }>()
    for (const r of redemptions) {
      const key = String(r.merchant_id ?? r.merchant_name ?? 'unknown')
      const name = String(r.merchant_name ?? '')
      const entry = merchantTotals.get(key) ?? { name, savings: 0 }
      entry.savings += Number(r.savings_cents ?? 0)
      if (!entry.name && name) entry.name = name
      merchantTotals.set(key, entry)
    }
    const top_merchants = (
      await Promise.all(
        Array.from(merchantTotals.entries()).map(async ([id, m]) => {
          let name = m.name
          if (!name && id !== 'unknown') {
            const merchant = await findById<Record<string, unknown>>('merchants', id)
            name = merchant?.business_name ? String(merchant.business_name) : 'Merchant'
          }
          return { name: name || 'Merchant', savings_cents: m.savings }
        }),
      )
    )
      .sort((a, b) => b.savings_cents - a.savings_cents)
      .slice(0, 5)

    const notificationsWhere: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (from)
      notificationsWhere.push({ field: 'created_at', operator: '>=', value: new Date(from) })
    if (to) notificationsWhere.push({ field: 'created_at', operator: '<=', value: new Date(to) })

    const notifications = await findMany<Record<string, unknown>>('notifications', {
      where: notificationsWhere,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 8,
    })

    const recent_activity: { id: string; text: string; ts: string }[] = []
    for (const r of redemptions.slice(0, 5)) {
      const action = r.status === 'redeemed' ? 'Redeemed' : 'Saved'
      const merchant = r.merchant_name ? String(r.merchant_name) : 'a merchant'
      recent_activity.push({
        id: String(r.id),
        text: `${action} a coupon at ${merchant}`,
        ts: asISO(r.purchased_at ?? r.created_at),
      })
    }
    for (const n of notifications.slice(0, 3)) {
      recent_activity.push({
        id: String(n.id),
        text: String(n.title ?? ''),
        ts: asISO(n.created_at),
      })
    }
    recent_activity.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

    res.json({
      total_savings_cents: totalSavings,
      saved_count: savedCount,
      redeemed_count: redeemedCount,
      expiring_count: expiringCount,
      top_merchants,
      recent_activity: recent_activity.slice(0, 8),
    })
  },
)

export default router
