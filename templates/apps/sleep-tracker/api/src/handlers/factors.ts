/**
 * Sleep-factor catalog + correlation handlers.
 *
 * - Catalog reads (factor_definitions) are public.
 * - Correlation reads scope by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const correlationQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional(),
})

router.get('/defaults', async (_req: Request, res: Response): Promise<void> => {
  const orderBy: OrderBy[] = [{ field: 'category', direction: 'asc' }]
  const defs = await findMany('factor_definitions', { orderBy, limit: 200, offset: 0 })
  if ((defs as unknown[]).length > 0) {
    res.json(defs)
    return
  }
  res.json([
    { slug: 'caffeine', label: 'Caffeine', category: 'substance', impact: 'negative' },
    { slug: 'alcohol', label: 'Alcohol', category: 'substance', impact: 'negative' },
    { slug: 'exercise', label: 'Exercise', category: 'activity', impact: 'positive' },
    { slug: 'screen_time', label: 'Screen Time', category: 'activity', impact: 'negative' },
    { slug: 'stress', label: 'Stress', category: 'mental', impact: 'negative' },
  ])
})

router.get(
  '/correlation',
  validateQuery(correlationQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const { days } = req.query as z.infer<typeof correlationQuerySchema>
    const since = new Date()
    since.setDate(since.getDate() - (days ?? 30))

    const where: WhereCondition[] = [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'sleep_date', operator: '>=', value: since.toISOString().slice(0, 10) },
    ]
    const orderBy: OrderBy[] = [{ field: 'sleep_date', direction: 'asc' }]
    const logs = await findMany<Record<string, unknown>>('sleep_logs', {
      where,
      orderBy,
      limit: 500,
      offset: 0,
    })

    const factorStats: Record<
      string,
      { totalQuality: number; totalDuration: number; count: number }
    > = {}
    for (const log of logs) {
      const raw = log.factors as unknown
      const factors = Array.isArray(raw)
        ? (raw as string[])
        : typeof raw === 'string'
          ? safeParseArray(raw)
          : []
      const quality = log.quality_score as number | null
      const duration = log.duration_minutes as number
      for (const factor of factors) {
        if (!factorStats[factor]) {
          factorStats[factor] = { totalQuality: 0, totalDuration: 0, count: 0 }
        }
        if (quality != null) factorStats[factor].totalQuality += quality
        factorStats[factor].totalDuration += duration
        factorStats[factor].count++
      }
    }

    const correlations = Object.entries(factorStats)
      .map(([factor, data]) => ({
        factor,
        average_quality: data.count > 0 ? data.totalQuality / data.count : null,
        average_duration: data.count > 0 ? Math.round(data.totalDuration / data.count) : 0,
        occurrences: data.count,
      }))
      .sort((a, b) => (b.average_quality ?? 0) - (a.average_quality ?? 0))

    res.json(correlations)
  },
)

function safeParseArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch (_error) {
    // non-JSON factors value — fall back to empty array
    return []
  }
}

export default router
