/**
 * Studio handler — creator dashboard stats + the signed-in user's own videos.
 *
 * The Creator Studio page (`/studio`) renders channel analytics plus the
 * creator's video table, which must include the draft / processing rows the
 * public `/videos` list intentionally hides. Both endpoints are scoped to the
 * session user via `getUserId(res)` — no route accepts a `user_id` parameter,
 * so a caller can only ever see their own studio.
 *
 * Why not reuse `/videos`? That list is world-readable and filters
 * `status='published'`, so it can neither surface a creator's unpublished work
 * nor aggregate their totals. Studio is a distinct, owner-only view.
 *
 * Response shapes match what `app/src/pages/Studio.tsx` consumes:
 *   GET /studio/stats  → { total_views, watch_time_hours, subscribers,
 *                          subscribers_delta_7d, revenue_cents,
 *                          revenue_delta_pct, ctr_pct }
 *   GET /studio/videos → Array<{ id, title, status, views, likes, comments,
 *                          published_at, cover_index, duration_seconds }>
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

/** Coerce a possibly-missing numeric column to a finite number (0 otherwise). */
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

/**
 * Deterministic cover-gradient index derived from the video id — mirrors the
 * `enrichVideo` projection in `videos.ts` so a video shows the same thumbnail
 * gradient in the studio table as it does on the public grid.
 */
const coverIndexFor = (id: string): number => {
  const hashSlice = id.slice(-4)
  const idx = hashSlice ? parseInt(hashSlice, 16) % 7 : 0
  return Number.isFinite(idx) ? idx : 0
}

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }

    // Every video the caller owns (any status) — the studio aggregates over
    // everything the creator has, not just the published rows.
    const videos = await findMany<Record<string, unknown>>('videos', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1000,
    })

    const totalViews = videos.reduce((sum, v) => sum + num(v.view_count), 0)
    const totalLikes = videos.reduce((sum, v) => sum + num(v.like_count), 0)
    // Watch-time proxy: assume each view runs the video's full duration. The
    // schema has no per-view watched-seconds column, so this is the closest
    // real signal (views × duration).
    const watchTimeHours = Math.round(
      videos.reduce((sum, v) => sum + num(v.view_count) * num(v.duration_sec), 0) / 3600,
    )

    // Subscribers = the sum of subscriber_count across the channels this user
    // owns (the follows handler maintains subscriber_count on each channel).
    const channels = await findMany<Record<string, unknown>>('channels', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const subscribers = channels.reduce((sum, c) => sum + num(c.subscriber_count), 0)

    // New subscribers in the last 7 days: follows onto any of the user's
    // channels created since the cutoff. Skip the query when the user owns no
    // channels — an empty `in` set is a meaningless filter.
    const channelIds = channels.map((c) => String(c.id)).filter(Boolean)
    let subscribersDelta7d = 0
    if (channelIds.length > 0) {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const where: WhereCondition[] = [
        { field: 'targetType', operator: '=', value: 'channel' },
        { field: 'targetId', operator: 'in', value: channelIds },
        { field: 'createdAt', operator: '>=', value: weekAgo },
      ]
      subscribersDelta7d = await count('follows', where)
    }

    // Engagement rate (likes ÷ views) stands in for click-through: the schema
    // tracks no thumbnail-impression stream, so a true impression→click rate
    // can't be computed. Guard divide-by-zero for a creator with no views yet.
    const ctrPct = totalViews > 0 ? Number(((totalLikes / totalViews) * 100).toFixed(1)) : 0

    res.json({
      total_views: totalViews,
      watch_time_hours: watchTimeHours,
      subscribers,
      subscribers_delta_7d: subscribersDelta7d,
      // No creator-monetization model exists in this schema — report zero
      // rather than fabricate earnings.
      revenue_cents: 0,
      revenue_delta_pct: 0,
      ctr_pct: ctrPct,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/videos', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }

    const videos = await findMany<Record<string, unknown>>('videos', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })

    // Project DB rows (snake_case counters, `duration_sec`) into the shape the
    // React studio table is typed against (`views`/`likes`/`comments`,
    // `duration_seconds`, deterministic `cover_index`).
    const projected = videos.map((v) => {
      const id = String(v.id ?? '')
      // Drafts have a null published_at; fall back to created_at so the table
      // renders a real date instead of the Unix epoch.
      const publishedAt = v.published_at ?? v.created_at ?? null
      const rawStatus = typeof v.status === 'string' ? v.status : 'draft'
      // A published row with a future publish time reads as "scheduled" in the
      // studio table (the UI distinguishes that state); otherwise keep the
      // stored status.
      const isFuture = publishedAt ? new Date(String(publishedAt)).getTime() > Date.now() : false
      const status = rawStatus === 'published' && isFuture ? 'scheduled' : rawStatus
      return {
        id,
        title: typeof v.title === 'string' ? v.title : '',
        status,
        views: num(v.view_count),
        likes: num(v.like_count),
        comments: num(v.comment_count),
        published_at: publishedAt,
        cover_index: coverIndexFor(id),
        duration_seconds: num(v.duration_sec),
      }
    })

    res.json(projected)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
