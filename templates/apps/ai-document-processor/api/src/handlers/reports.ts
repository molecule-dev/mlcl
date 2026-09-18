/**
 * Dashboard reporting endpoints.
 *
 * The Dashboard page (`app/src/pages/Dashboard.tsx`) calls
 * `GET /api/reports/dashboard_stats` to populate hero/metric tiles
 * (processed today, pending review, queue size, accuracy, etc.) plus a
 * 7-day history sparkline and a per-document-type breakdown.
 *
 * All numbers come from the user's own `documents` rows — no
 * aggregation across tenants and no fixture data, so the sparkline
 * starts empty and grows as the user uploads.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const startOfDay = (d: Date): Date => {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

const daysAgo = (n: number): Date => {
  const x = startOfDay(new Date())
  x.setDate(x.getDate() - n)
  return x
}

router.get('/dashboard_stats', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
    })
    return
  }

  try {
    const documents = (await findMany('documents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'uploaded_at', direction: 'desc' }],
    })) as Record<string, unknown>[]

    const now = new Date()
    const todayStart = startOfDay(now)
    const yesterdayStart = daysAgo(1)

    const isAfter = (date: unknown, ref: Date): boolean => {
      if (!date) return false
      const d = date instanceof Date ? date : new Date(String(date))
      return d.getTime() >= ref.getTime()
    }
    const isBefore = (date: unknown, ref: Date): boolean => {
      if (!date) return false
      const d = date instanceof Date ? date : new Date(String(date))
      return d.getTime() < ref.getTime()
    }

    const processedToday = documents.filter((d) => isAfter(d.uploaded_at, todayStart)).length
    const processedYesterday = documents.filter(
      (d) => isAfter(d.uploaded_at, yesterdayStart) && isBefore(d.uploaded_at, todayStart),
    ).length

    const pendingReview = documents.filter((d) => {
      const conf = Number(d.classification_confidence ?? 0)
      return conf > 0 && conf < 0.7
    }).length

    const queueSize = documents.filter(
      (d) =>
        d.status === 'uploaded' ||
        d.status === 'ocring' ||
        d.status === 'extracting' ||
        d.status === 'classifying',
    ).length

    const ready = documents.filter((d) => d.status === 'ready')
    const avgAccuracy =
      ready.length === 0
        ? 0
        : (ready.reduce((sum, d) => sum + Number(d.classification_confidence ?? 0), 0) /
            ready.length) *
          100

    const processed = ready.filter((d) => d.processed_at && d.uploaded_at)
    const avgProcessingSeconds =
      processed.length === 0
        ? 0
        : processed.reduce((sum, d) => {
            const start = new Date(String(d.uploaded_at)).getTime()
            const end = new Date(String(d.processed_at)).getTime()
            return sum + Math.max(0, (end - start) / 1000)
          }, 0) / processed.length

    const history7d: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const day = daysAgo(i)
      const next = daysAgo(i - 1)
      const count = documents.filter(
        (d) => isAfter(d.uploaded_at, day) && isBefore(d.uploaded_at, next),
      ).length
      history7d.push({ date: day.toISOString().slice(0, 10), count })
    }

    const typeCounts = new Map<string, number>()
    for (const d of documents) {
      const cls = String(d.doc_class ?? 'other')
      typeCounts.set(cls, (typeCounts.get(cls) ?? 0) + 1)
    }
    const typeBreakdown = Array.from(typeCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)

    const change =
      processedYesterday === 0
        ? processedToday > 0
          ? 100
          : 0
        : Math.round(((processedToday - processedYesterday) / processedYesterday) * 100)

    res.json({
      processed_today: processedToday,
      processed_change_pct: change,
      pending_review: pendingReview,
      avg_accuracy_pct: Math.round(avgAccuracy * 10) / 10,
      queue_size: queueSize,
      avg_processing_seconds: Math.round(avgProcessingSeconds * 10) / 10,
      history_7d: history7d,
      type_breakdown: typeBreakdown,
    })
  } catch (error) {
    logger.error('reports.dashboard_stats', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
