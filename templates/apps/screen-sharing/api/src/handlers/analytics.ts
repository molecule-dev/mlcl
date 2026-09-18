/**
 * Analytics handler — aggregates engagement across all recordings the
 * caller owns. Returns KPI totals, per-recording rollups, recent viewer
 * rows, and a 24-bucket attention heatmap derived from view records'
 * `watched_until` field.
 *
 * No external service is called and no upstream-API mocks are needed —
 * every datapoint comes from rows in the local Postgres tables.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

router.use(requireAuth)

router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const recordings = await findMany<Record<string, unknown>>('recordings', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 500,
    })
    const recordingIds = recordings.map((r) => String(r.id ?? '')).filter(Boolean)
    let views: Record<string, unknown>[] = []
    if (recordingIds.length > 0) {
      views = await findMany<Record<string, unknown>>('recording_views', {
        where: [{ field: 'recording_id', operator: 'in', value: recordingIds }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 5_000,
      })
    }
    let comments: Record<string, unknown>[] = []
    if (recordingIds.length > 0) {
      comments = await findMany<Record<string, unknown>>('recording_comments', {
        where: [{ field: 'recording_id', operator: 'in', value: recordingIds }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 5_000,
      })
    }

    const totalRecordings = recordings.length
    const totalViews = views.length
    const avgWatchPercent = views.length
      ? Math.round(views.reduce((sum, v) => sum + (Number(v.watch_percent) || 0), 0) / views.length)
      : 0

    const titleById = new Map<string, string>()
    const durationById = new Map<string, number>()
    for (const rec of recordings) {
      const id = String(rec.id ?? '')
      titleById.set(id, String(rec.title ?? 'Untitled recording'))
      durationById.set(id, Number(rec.duration_ms ?? 0))
    }

    const viewsByRecording = new Map<string, Record<string, unknown>[]>()
    for (const v of views) {
      const rid = String(v.recording_id ?? '')
      if (!rid) continue
      const list = viewsByRecording.get(rid) ?? []
      list.push(v)
      viewsByRecording.set(rid, list)
    }
    const topRecordings = recordings
      .map((rec) => {
        const id = String(rec.id ?? '')
        const recViews = viewsByRecording.get(id) ?? []
        const avg = recViews.length
          ? Math.round(
              recViews.reduce((s, v) => s + (Number(v.watch_percent) || 0), 0) / recViews.length,
            )
          : 0
        return {
          id,
          title: String(rec.title ?? 'Untitled recording'),
          views: Number(rec.view_count ?? recViews.length),
          watchPercent: avg,
        }
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5)

    const recentViewers = views.slice(0, 8).map((v) => {
      const rid = String(v.recording_id ?? '')
      const recordingTitle = titleById.get(rid) ?? 'Recording'
      const watchedUntil = Number(v.watched_until ?? v.watched_seconds_total ?? 0) * 1000
      const total = Number(v.watched_seconds_total ?? 0)
      const watchPercent = Number(v.watch_percent ?? 0)
      const fallbackName = String(v.viewer_email ?? v.viewer_user_id ?? 'Viewer')
      return {
        id: String(v.id ?? ''),
        name: fallbackName,
        recordingId: rid,
        recordingTitle,
        watchedAt: String(v.created_at ?? new Date().toISOString()),
        watchedSeconds: total,
        watchedUntilMs: watchedUntil,
        durationSeconds: Math.round(((durationById.get(rid) ?? 0) || 1) / 1000),
        watchPercent,
      }
    })

    // 24-bucket attention heatmap: bucket each view's max-watched timestamp
    // into one of 24 even segments of its own recording. Lets the chart
    // show where attention drops off in aggregate.
    const HEATMAP_BUCKETS = 24
    const heatmap = new Array<number>(HEATMAP_BUCKETS).fill(0)
    for (const v of views) {
      const rid = String(v.recording_id ?? '')
      const dur = durationById.get(rid) ?? 0
      if (dur <= 0) continue
      const watched = Number(v.watched_until ?? v.watched_seconds_total ?? 0) * 1000
      const ratio = Math.max(0, Math.min(1, watched / dur))
      const idx = Math.min(HEATMAP_BUCKETS - 1, Math.floor(ratio * HEATMAP_BUCKETS))
      heatmap[idx] += 1
    }

    const trend7d = new Array<number>(7).fill(0)
    const now = Date.now()
    for (const v of views) {
      const created = new Date(String(v.created_at ?? '')).getTime()
      if (!Number.isFinite(created)) continue
      const dayDelta = Math.floor((now - created) / (1000 * 60 * 60 * 24))
      if (dayDelta >= 0 && dayDelta < 7) {
        trend7d[6 - dayDelta] += 1
      }
    }
    const lastWeek = trend7d.reduce((s, n) => s + n, 0)
    let prior = 0
    for (const v of views) {
      const created = new Date(String(v.created_at ?? '')).getTime()
      if (!Number.isFinite(created)) continue
      const dayDelta = Math.floor((now - created) / (1000 * 60 * 60 * 24))
      if (dayDelta >= 7 && dayDelta < 14) prior += 1
    }
    const weeklyChangePercent =
      prior === 0 ? (lastWeek > 0 ? 100 : 0) : Math.round(((lastWeek - prior) / prior) * 100)

    const commentsThisWeek = comments.filter((c) => {
      const created = new Date(String(c.created_at ?? '')).getTime()
      if (!Number.isFinite(created)) return false
      return now - created < 1000 * 60 * 60 * 24 * 7
    }).length

    const viewsToday = views.filter((v) => {
      const created = new Date(String(v.created_at ?? '')).getTime()
      if (!Number.isFinite(created)) return false
      return now - created < 1000 * 60 * 60 * 24
    }).length

    res.json({
      totalRecordings,
      totalViews,
      averageWatchPercent: avgWatchPercent,
      trend7d,
      weeklyChangePercent,
      viewsToday,
      avgWatchSeconds: views.length
        ? Math.round(
            views.reduce((s, v) => s + (Number(v.watched_seconds_total) || 0), 0) / views.length,
          )
        : 0,
      commentsThisWeek,
      topRecordings,
      recentViewers,
      heatmap,
    })
  } catch (error) {
    logger.error('analytics.overview', error)
    res.status(500).json({
      error: t('analytics.error', undefined, { defaultValue: 'Failed to compute analytics' }),
    })
  }
})

export default router
