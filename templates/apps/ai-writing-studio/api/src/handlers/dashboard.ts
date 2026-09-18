/**
 * Dashboard summary handler — returns aggregate writing statistics for
 * the authenticated user (KPI counts, recent documents, weekly streak
 * heatmap, trending topic suggestions). All data derived from the
 * abstract DataStore; no external services.
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface DocumentRow {
  id: string
  title: string
  summary?: string | null
  status: string
  word_count: number
  reading_minutes: number
  seo_score?: number | null
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
    const [totalDocs, publishedDocs, aiSuggestions, recentDocs, allPublished] = await Promise.all([
      count('documents', [{ field: 'user_id', operator: '=', value: userId }]),
      count('documents', [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'published' },
      ]),
      findMany<{ tokens_used?: number; created_at?: string | Date }>('ai_suggestions', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 1000,
      }),
      findMany<DocumentRow>('documents', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
        limit: 6,
      }),
      findMany<DocumentRow>('documents', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'status', operator: '=', value: 'published' },
          { field: 'seo_score', operator: 'is_not_null' },
        ],
        limit: 1000,
      }),
    ])

    // Avg SEO score across published docs.
    const seoScores = (allPublished as DocumentRow[])
      .map((d) => Number(d.seo_score ?? 0))
      .filter((n) => n > 0)
    const avgSeoScore = seoScores.length
      ? Math.round(seoScores.reduce((a, b) => a + b, 0) / seoScores.length)
      : 0

    // Total AI words used (output tokens approximated as words).
    const aiWordsUsed = (aiSuggestions as Array<{ tokens_used?: number }>).reduce(
      (acc, s) => acc + Number(s.tokens_used ?? 0),
      0,
    )

    // Streak: count consecutive days back from today with at least one
    // document update or AI suggestion.
    const activityDates = new Set<string>()
    for (const d of recentDocs as DocumentRow[]) {
      const date = d.last_edited_at ?? d.updated_at
      if (date) activityDates.add(new Date(date as string | Date).toISOString().slice(0, 10))
    }
    for (const s of aiSuggestions as Array<{ created_at?: string | Date }>) {
      if (s.created_at) {
        activityDates.add(new Date(s.created_at as string | Date).toISOString().slice(0, 10))
      }
    }
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (activityDates.has(key)) streak++
      else if (i > 0) break
    }

    // Two-week heatmap (14 days, intensity 0-100 by AI suggestion count
    // proxied to writing activity).
    const heatmap: Array<{ date: string; intensity: number }> = []
    const dayCounts = new Map<string, number>()
    for (const s of aiSuggestions as Array<{ created_at?: string | Date }>) {
      if (!s.created_at) continue
      const key = new Date(s.created_at as string | Date).toISOString().slice(0, 10)
      dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
    }
    const maxDay = Math.max(1, ...dayCounts.values())
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const c = dayCounts.get(key) ?? 0
      heatmap.push({ date: key, intensity: Math.round((c / maxDay) * 100) })
    }

    // Words this week (sum of word_count from docs edited in last 7 days).
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const wordsThisWeek = (recentDocs as DocumentRow[])
      .filter((d) => {
        const date = d.last_edited_at ?? d.updated_at
        return date && new Date(date as string | Date) >= weekAgo
      })
      .reduce((acc, d) => acc + Number(d.word_count ?? 0), 0)

    // Recent documents projection (small, safe).
    const recent = (recentDocs as DocumentRow[]).map((d) => ({
      id: String(d.id),
      title: String(d.title),
      excerpt: d.summary ?? '',
      status: String(d.status),
      wordCount: Number(d.word_count ?? 0),
      readingMinutes: Number(d.reading_minutes ?? 0),
      seoScore: d.seo_score == null ? null : Number(d.seo_score),
      updatedAt: d.last_edited_at ?? d.updated_at,
    }))

    res.json({
      kpis: {
        totalDocuments: totalDocs,
        publishedThisMonth: publishedDocs,
        avgSeoScore,
        aiWordsUsed,
        aiWordsLimit: 100_000,
      },
      streak: { dayStreak: streak, wordsThisWeek, heatmap },
      recentDocuments: recent,
    })
  } catch (error) {
    logger.error('dashboard.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
