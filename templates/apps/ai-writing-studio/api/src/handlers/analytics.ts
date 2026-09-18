/**
 * Analytics handler — surfaces aggregate writing analytics derived from
 * the user's documents and AI suggestions. There is no traffic-source or
 * geography ingestion in this template, so those keys are returned as
 * empty arrays — the UI must render an empty state when data is absent
 * rather than fall back to fake fixtures.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface DocumentRow {
  id: string
  title: string
  status: string
  word_count: number
  reading_minutes: number
  updated_at: string | Date
  last_edited_at?: string | Date | null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const docs = (await findMany<DocumentRow>('documents', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })) as DocumentRow[]

    // Activity over the last 30 days — count of documents edited per day.
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayCounts = new Map<string, number>()
    for (const d of docs) {
      const date = d.last_edited_at ?? d.updated_at
      if (!date) continue
      const key = new Date(date as string | Date).toISOString().slice(0, 10)
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    }
    const series: Array<{ date: string; value: number }> = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      series.push({ date: key, value: dayCounts.get(key) ?? 0 })
    }

    // Top documents by word count (proxy for reach in absence of traffic).
    const topArticles = [...docs]
      .filter((d) => d.status === 'published')
      .sort((a, b) => Number(b.word_count ?? 0) - Number(a.word_count ?? 0))
      .slice(0, 8)
      .map((d) => ({
        id: String(d.id),
        title: String(d.title),
        wordCount: Number(d.word_count ?? 0),
        readingMinutes: Number(d.reading_minutes ?? 0),
      }))

    const totals = docs.reduce(
      (acc, d) => {
        acc.totalWords += Number(d.word_count ?? 0)
        acc.totalReadMinutes += Number(d.reading_minutes ?? 0)
        if (d.status === 'published') acc.publishedCount++
        if (d.status === 'draft') acc.draftCount++
        return acc
      },
      { totalWords: 0, totalReadMinutes: 0, publishedCount: 0, draftCount: 0 },
    )

    res.json({
      totals,
      series,
      topArticles,
      // The template does not ingest traffic-source or geography data;
      // surface them as empty arrays so the UI can render an empty state
      // instead of fake placeholder rows.
      trafficSources: [],
      geography: [],
    })
  } catch (error) {
    logger.error('analytics.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
