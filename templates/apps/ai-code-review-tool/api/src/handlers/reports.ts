/**
 * Reports handler — owner-scoped analytics aggregations.
 *
 * Routes:
 *   GET /reports/summary     overall counts + average score for the caller
 *   GET /reports/top-repos   top repositories by review volume
 *   GET /reports/leaderboard top reviewers across owned reviews
 *   GET /reports/trend       quality-score trend buckets (last N days)
 *
 * Owner-scoped via `owner_id` on the underlying tables (G6 — IDOR-safe).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { count, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const rangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
})

router.use(authorizers.auth())

interface ReviewRow {
  id: string
  pr_id: string
  status: string
  quality_score: number | null
  started_at: string | null
  completed_at: string | null
}

interface PullRequestRow {
  id: string
  repository_id: string | null
  author_login: string | null
  state: string | null
  opened_at: string | null
}

interface RepositoryRow {
  id: string
  full_name: string | null
  provider: string | null
}

router.get('/summary', validateQuery(rangeSchema), async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const [openPrs, mergedPrs, criticalReviews, totalReviews, totalRepos] = await Promise.all([
      count('pull_requests', [...where, { field: 'state', operator: '=', value: 'open' }]),
      count('pull_requests', [...where, { field: 'state', operator: '=', value: 'merged' }]),
      count('reviews', [...where, { field: 'status', operator: '=', value: 'failed' }]),
      count('reviews', where),
      count('repositories', where),
    ])
    const reviews = await findMany<ReviewRow>('reviews', {
      where,
      orderBy: [{ field: 'completed_at', direction: 'desc' }],
      limit: 200,
    })
    const scored = reviews.filter((r) => r.quality_score !== null && r.quality_score !== undefined)
    const avgScore =
      scored.length === 0
        ? 0
        : scored.reduce((acc, r) => acc + (r.quality_score ?? 0), 0) / scored.length
    res.json({
      openPrs,
      mergedPrs,
      criticalReviews,
      totalReviews,
      totalRepos,
      avgScore: Number((avgScore / 10).toFixed(2)),
    })
  } catch (err) {
    logger.error('reports.summary', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/top-repos', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const [repos, prs] = await Promise.all([
      findMany<RepositoryRow>('repositories', { where, limit: 100 }),
      findMany<PullRequestRow>('pull_requests', { where, limit: 500 }),
    ])
    const counts = new Map<string, { repository_id: string; full_name: string; prs: number }>()
    for (const repo of repos) {
      counts.set(repo.id, {
        repository_id: repo.id,
        full_name: repo.full_name ?? repo.id,
        prs: 0,
      })
    }
    for (const pr of prs) {
      if (pr.repository_id && counts.has(pr.repository_id)) {
        const entry = counts.get(pr.repository_id)
        if (entry) entry.prs += 1
      }
    }
    const sorted = [...counts.values()].sort((a, b) => b.prs - a.prs).slice(0, 10)
    res.json(sorted)
  } catch (err) {
    logger.error('reports.topRepos', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const prs = await findMany<PullRequestRow>('pull_requests', { where, limit: 500 })
    const byAuthor = new Map<string, { author_login: string; reviews: number }>()
    for (const pr of prs) {
      const key = pr.author_login || ''
      if (!key) continue
      if (!byAuthor.has(key)) byAuthor.set(key, { author_login: key, reviews: 0 })
      const entry = byAuthor.get(key)
      if (entry) entry.reviews += 1
    }
    const sorted = [...byAuthor.values()].sort((a, b) => b.reviews - a.reviews).slice(0, 10)
    res.json(sorted)
  } catch (err) {
    logger.error('reports.leaderboard', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

interface ReviewCommentRow {
  id: string
  severity: string | null
  category: string | null
}

router.get('/severity-counts', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const [comments, mergedPrs] = await Promise.all([
      findMany<ReviewCommentRow>('review_comments', { where, limit: 1000 }),
      count('pull_requests', [...where, { field: 'state', operator: '=', value: 'merged' }]),
    ])
    const totals: Record<string, number> = { high: 0, med: 0, low: 0, info: 0 }
    for (const c of comments) {
      const s = (c.severity ?? 'info').toLowerCase()
      if (s in totals) totals[s] = (totals[s] ?? 0) + 1
      else totals.info = (totals.info ?? 0) + 1
    }
    res.json({
      critical: totals.high,
      changes_requested: totals.med,
      suggestion: totals.low + totals.info,
      approved: mergedPrs,
      total: comments.length,
    })
  } catch (err) {
    logger.error('reports.severityCounts', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/trend', validateQuery(rangeSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { days } = req.query as unknown as z.infer<typeof rangeSchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    const reviews = await findMany<ReviewRow>('reviews', {
      where,
      orderBy: [{ field: 'completed_at', direction: 'desc' }],
      limit: 500,
    })
    const buckets: number[] = new Array(Math.min(days, 30)).fill(0)
    const counts: number[] = new Array(buckets.length).fill(0)
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    for (const r of reviews) {
      const completedAt = r.completed_at ? new Date(r.completed_at).getTime() : 0
      if (!completedAt) continue
      const dayIdx = Math.floor((now - completedAt) / dayMs)
      if (dayIdx < 0 || dayIdx >= buckets.length) continue
      const bucket = buckets.length - 1 - dayIdx
      buckets[bucket] += (r.quality_score ?? 0) / 10
      counts[bucket] += 1
    }
    const series = buckets.map((sum, i) =>
      counts[i]! > 0 ? Number((sum / counts[i]!).toFixed(2)) : 0,
    )
    res.json({ series, days: buckets.length })
  } catch (err) {
    logger.error('reports.trend', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
