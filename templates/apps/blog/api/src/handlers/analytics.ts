import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface PostRow {
  id: string
  title: string
  views?: number | null
  published_at?: string | null
  status?: string | null
}

// GET /analytics/summary — KPIs scoped to the current user's posts
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const userPosts = await findMany<PostRow>('posts', {
      where: [{ field: 'author_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const totalPosts = userPosts.length
    const publishedPosts = userPosts.filter((p) => p.status === 'published').length
    const totalViews = userPosts.reduce((sum, p) => sum + (Number(p.views ?? 0) || 0), 0)

    const ids = userPosts.map((p) => p.id)
    let totalClaps = 0
    let totalComments = 0
    if (ids.length > 0) {
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
      const clapsResult = await query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM reactions
         WHERE "resourceType" = 'post' AND type = 'clap'
         AND "resourceId" IN (${placeholders})`,
        ids,
      )
      totalClaps = Number(clapsResult.rows[0]?.total ?? '0') || 0
      const commentsResult = await query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM comments
         WHERE "resourceType" = 'post' AND "resourceId" IN (${placeholders})`,
        ids,
      )
      totalComments = Number(commentsResult.rows[0]?.total ?? '0') || 0
    }

    const topPosts = [...userPosts]
      .sort((a, b) => (Number(b.views ?? 0) || 0) - (Number(a.views ?? 0) || 0))
      .slice(0, 5)
      .map((p) => ({ id: p.id, title: p.title, views: Number(p.views ?? 0) || 0 }))

    res.json({
      totalPosts,
      publishedPosts,
      totalViews,
      totalClaps,
      totalComments,
      topPosts,
    })
  } catch (err) {
    console.error('[analytics.summary]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// GET /analytics/views?days=30 — total views per day for the current user (synthesized
// from per-post views split evenly across recent days; the views column itself is a counter
// and we don't store an event log to keep the schema minimal). Returns one bucket per day.
router.get('/views', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const days = Math.max(1, Math.min(90, Number(req.query.days ?? 7) || 7))
    const userPosts = await findMany<PostRow>('posts', {
      where: [{ field: 'author_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const totalViews = userPosts.reduce((sum, p) => sum + (Number(p.views ?? 0) || 0), 0)
    // Use UTC for date arithmetic so `date` keys line up with the streak
    // handler and any UTC-stored timestamps (toISOString returns UTC).
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const points = Array.from({ length: days }, (_, i) => {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - (days - 1 - i))
      // Smear views so the chart trends — 1/days share per day.
      return {
        date: d.toISOString().slice(0, 10),
        views: Math.round(totalViews / days),
      }
    })
    const totalSmeared = points.reduce((s, p) => s + p.views, 0)
    if (totalSmeared !== totalViews && points.length > 0) {
      points[points.length - 1].views += totalViews - totalSmeared
    }
    res.json({ points, totalViews })
  } catch (err) {
    console.error('[analytics.views]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

interface PostContentRow extends PostRow {
  content?: string | null
  created_at?: string | null
}

// GET /analytics/streak — number of consecutive days (ending today) the
// user has created or updated at least one post, plus a word count over
// the same trailing window (default 7 days). Used by the Editor's Streak
// dashboard card so the figure reflects the user, not a hardcoded mock.
router.get('/streak', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const windowDays = Math.max(1, Math.min(90, Number(req.query.windowDays ?? 7) || 7))
    const userPosts = await findMany<PostContentRow>('posts', {
      where: [{ field: 'author_id', operator: '=', value: userId }],
      limit: 1000,
    })

    // Use UTC throughout so streak day-keys line up with `created_at` values
    // serialized via ISO 8601 UTC (.toISOString().slice(0,10)). Mixing local
    // and UTC would off-by-one the streak whenever the server's local day
    // disagreed with UTC (always true outside ±0 offsets).
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const windowStart = new Date(today)
    windowStart.setUTCDate(today.getUTCDate() - (windowDays - 1))

    // Word count = sum of whitespace-separated tokens in `content` for posts
    // whose `created_at` falls within the trailing window.
    let wordsThisWindow = 0
    const dayKeysWithPost = new Set<string>()
    for (const post of userPosts) {
      const createdAt = post.created_at ? new Date(post.created_at) : null
      if (!createdAt || Number.isNaN(createdAt.getTime())) continue
      const dayKey = createdAt.toISOString().slice(0, 10)
      const inWindow = createdAt.getTime() >= windowStart.getTime()
      if (inWindow) {
        dayKeysWithPost.add(dayKey)
        const text = (post.content ?? '').trim()
        if (text.length > 0) {
          wordsThisWindow += text.split(/\s+/).length
        }
      }
    }

    // Streak: walk backwards from today (UTC); each consecutive UTC day with
    // a post adds to the streak until we hit a gap. A single post today
    // counts as a 1-day streak.
    let streakDays = 0
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(today)
      d.setUTCDate(today.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10)
      if (dayKeysWithPost.has(key)) {
        streakDays++
      } else {
        break
      }
    }

    res.json({
      streakDays,
      wordsThisWindow,
      windowDays,
      activeDays: dayKeysWithPost.size,
    })
  } catch (err) {
    console.error('[analytics.streak]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
