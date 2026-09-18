/**
 * Reports handler — server-side aggregations powering the dashboard KPIs.
 *
 * Computes counts directly from the DB tables that the app already
 * writes to (datasets, analyses, insights, saved_reports). Returns one
 * KPI tile per metric in the shape the Dashboard expects:
 *   { kpis: [{ key, label, value, delta_pct, sparkline }, ...] }
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const dashboardQuerySchema = z.object({
  since: z.string().optional(),
})

const MS_PER_DAY = 24 * 60 * 60 * 1000

interface Tile {
  key: string
  label: string
  value: string
  delta_pct: number
  sparkline: number[]
}

/** Build an 8-bucket sparkline (7 days back → today) from row timestamps. */
function buildSparkline(
  rows: Array<{ created_at?: string | Date | null }>,
  dateField = 'created_at',
): number[] {
  const buckets = new Array<number>(8).fill(0)
  const now = Date.now()
  for (const row of rows) {
    const raw = (row as Record<string, unknown>)[dateField] ?? row.created_at
    if (!raw) continue
    const t = new Date(raw as string).getTime()
    if (Number.isNaN(t)) continue
    const ageDays = Math.floor((now - t) / MS_PER_DAY)
    const bucket = 7 - Math.min(7, Math.max(0, ageDays))
    buckets[bucket] += 1
  }
  return buckets
}

/** Cumulative sparkline from per-day counts so the dashboard tiles read like a "growth" view. */
function cumulative(buckets: number[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const b of buckets) {
    acc += b
    out.push(acc)
  }
  return out
}

/** Count rows in `rows` newer than `cutoffMs` ms ago. */
function recent(
  rows: Array<{ created_at?: string | Date | null }>,
  cutoffMs: number,
  dateField = 'created_at',
): number {
  const cutoff = Date.now() - cutoffMs
  let n = 0
  for (const row of rows) {
    const raw = (row as Record<string, unknown>)[dateField] ?? row.created_at
    if (!raw) continue
    const t = new Date(raw as string).getTime()
    if (!Number.isNaN(t) && t >= cutoff) n += 1
  }
  return n
}

router.get(
  '/dashboard_stats',
  validateQuery(dashboardQuerySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    // Seed demo data on first dashboard load so a freshly-signed-up user
    // sees real KPIs / insights / reports instead of an empty shell. The
    // helper is idempotent on user_id, so subsequent loads are a no-op.
    try {
      await seedDemoForUser(userId)
    } catch (err) {
      console.warn('seedDemoForUser failed for', userId, err)
    }

    // Scope the dashboard to the requested window — `since` was validated then ignored (the
    // handler never read req.query), so every window rendered all-time KPIs.
    const { since } = req.query as unknown as z.infer<typeof dashboardQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (since) where.push({ field: 'created_at', operator: '>=', value: new Date(since) })

    // Pull recent rows for each table. We use findMany with no limit on small
    // user-scoped sets; for very large rowsets a real implementation would
    // push the bucketing into SQL, but flagship users won't have >2k rows.
    const [datasets, analyses, insights, reports] = await Promise.all([
      findMany<{ created_at?: string | Date | null }>('datasets', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 500,
      }),
      findMany<{ created_at?: string | Date | null }>('analyses', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 1000,
      }),
      findMany<{ created_at?: string | Date | null }>('insights', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 500,
      }),
      findMany<{ created_at?: string | Date | null }>('saved_reports', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 200,
      }),
    ])

    const datasetsTotal = await count('datasets', where)
    const analysesTotal = await count('analyses', where)
    const insightsTotal = await count('insights', where)
    const reportsTotal = await count('saved_reports', where)

    const HALF_MONTH = (30 * MS_PER_DAY) / 2
    const MONTH = 30 * MS_PER_DAY
    function delta(rows: Array<{ created_at?: string | Date | null }>): number {
      const cur = recent(rows, HALF_MONTH)
      const prev = recent(rows, MONTH) - cur
      if (prev === 0) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / prev) * 1000) / 10
    }

    const kpis: Tile[] = [
      {
        key: 'queries',
        label: 'Queries this month',
        value: String(analysesTotal),
        delta_pct: delta(analyses),
        sparkline: cumulative(buildSparkline(analyses)),
      },
      {
        key: 'datasets',
        label: 'Active datasets',
        value: String(datasetsTotal),
        delta_pct: delta(datasets),
        sparkline: cumulative(buildSparkline(datasets)),
      },
      {
        key: 'insights',
        label: 'Insights surfaced',
        value: String(insightsTotal),
        delta_pct: delta(insights),
        sparkline: cumulative(buildSparkline(insights, 'detected_at')),
      },
      {
        key: 'shared',
        label: 'Saved reports',
        value: String(reportsTotal),
        delta_pct: delta(reports),
        sparkline: cumulative(buildSparkline(reports)),
      },
    ]

    res.json({ kpis })
  },
)

export default router
