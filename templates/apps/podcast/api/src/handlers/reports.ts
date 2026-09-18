/**
 * Reports — small read-only aggregates the player UI needs.
 *
 * `GET /reports/now-playing` powers the bottom-of-screen NowPlayingBar:
 * it returns the most recently-touched listening_progress row joined to
 * its episode + show. Returning `null` (not 404) when nothing is in
 * progress lets the UI render an empty bar without surfacing an error.
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

router.get('/now-playing', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.json(null)
      return
    }
    // Most recent in-progress (or recently completed) episode.
    const rows = await findMany<Record<string, unknown>>('listening_progress', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 1,
    })
    const progress = rows[0]
    if (!progress) {
      res.json(null)
      return
    }
    const episode = await findById<Record<string, unknown>>('episodes', String(progress.episode_id))
    if (!episode) {
      res.json(null)
      return
    }
    const show = await findById<Record<string, unknown>>('shows', String(episode.show_id))
    res.json({
      episode_id: String(progress.episode_id),
      show_id: episode.show_id ?? null,
      episode_title: episode.title ?? '',
      show_title: show?.title ?? '',
      audio_url: episode.audio_url ?? null,
      duration_seconds: episode.duration_seconds ?? 0,
      position_sec: progress.position_sec ?? 0,
      updated_at: progress.updated_at ?? null,
    })
  } catch (error) {
    logger.error('reports.nowPlaying', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
