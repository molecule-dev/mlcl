/**
 * Performance handler — derives transaction summary, p95 timeline, and
 * worst transactions from the app_transactions table (which is seeded
 * on first GET /api/issues).
 *
 * Returns a single payload the Performance page can render directly:
 *   {
 *     summary: { p50, p95, p99, throughput_per_min, error_rate, sample_count },
 *     timeline: Array<{ts, p95, throughput}>,
 *     worst: Array<{name, p95, throughput, error_rate, sample_count}>,
 *   }
 *
 * @module
 */

import { type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface AppTransactionRow {
  transaction_name: string
  duration_ms: number
  status: string
  environment: string
  release: string | null
  created_at: string | Date
}

const percentile = (values: number[], p: number): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return Math.round(sorted[idx] ?? 0)
}

router.get('/', async (_req, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  await seedDemoForUser(userId)
  const rows = await findMany<AppTransactionRow>('app_transactions', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 1000,
  })

  const allDurations = rows.map((r) => Number(r.duration_ms ?? 0))
  const errorCount = rows.filter((r) => r.status === 'error').length

  // bin by 6-minute buckets, last 12 buckets
  const bucketMinutes = 6
  const buckets = new Map<number, number[]>()
  const now = Date.now()
  for (const r of rows) {
    const ts = new Date(r.created_at).getTime()
    const bucket = Math.floor((now - ts) / (bucketMinutes * 60_000))
    if (bucket > 11) continue
    const list = buckets.get(bucket) ?? []
    list.push(Number(r.duration_ms ?? 0))
    buckets.set(bucket, list)
  }
  const timeline: Array<{ ts: string; p95: number; throughput: number }> = []
  for (let i = 11; i >= 0; i--) {
    const list = buckets.get(i) ?? []
    timeline.push({
      ts: new Date(now - i * bucketMinutes * 60_000).toISOString(),
      p95: percentile(list, 95),
      throughput: list.length,
    })
  }

  // group by transaction name
  const byName = new Map<string, AppTransactionRow[]>()
  for (const r of rows) {
    const list = byName.get(r.transaction_name) ?? []
    list.push(r)
    byName.set(r.transaction_name, list)
  }
  const worst = [...byName.entries()]
    .map(([name, list]) => {
      const durations = list.map((r) => Number(r.duration_ms ?? 0))
      const errors = list.filter((r) => r.status === 'error').length
      return {
        name,
        p95: percentile(durations, 95),
        throughput: list.length,
        error_rate: list.length === 0 ? 0 : errors / list.length,
        sample_count: list.length,
      }
    })
    .sort((a, b) => b.p95 - a.p95)
    .slice(0, 5)

  res.json({
    summary: {
      p50: percentile(allDurations, 50),
      p95: percentile(allDurations, 95),
      p99: percentile(allDurations, 99),
      throughput_per_min:
        allDurations.length === 0
          ? 0
          : Math.round(allDurations.length / Math.max(1, 12 * bucketMinutes)),
      error_rate: allDurations.length === 0 ? 0 : errorCount / allDurations.length,
      sample_count: allDurations.length,
    },
    timeline,
    worst,
  })
})

export default router
