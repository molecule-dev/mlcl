/**
 * Liked tracks handler — owner-scoped likes.
 *
 * Routes:
 *   POST   /api/tracks/:id/like     toggle: like the track (idempotent — no-op if already liked)
 *   DELETE /api/tracks/:id/like     unlike (idempotent)
 *
 * The "list liked tracks" surface lives at GET /api/tracks?liked=true (in
 * tracks.ts), so the player and likedSongs page have a single source of
 * truth for "is this track liked for me?". Same scope on every action via
 * `res.locals.session.userId`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { count, create, deleteMany, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router({ mergeParams: true })

router.post('/:id/like', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const trackId = String(req.params.id)
    const track = await findById('tracks', trackId)
    if (!track) {
      res
        .status(404)
        .json({ error: t('tracks.notFound', undefined, { defaultValue: 'Track not found' }) })
      return
    }
    const existing = await findMany('liked_tracks', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'track_id', operator: '=', value: trackId },
      ],
      limit: 1,
    })
    if (existing.length === 0) {
      await create('liked_tracks', {
        user_id: userId,
        track_id: trackId,
        liked_at: new Date(),
      })
    }
    const total = await count('liked_tracks', [{ field: 'user_id', operator: '=', value: userId }])
    res.status(201).json({ liked: true, total })
  } catch (error) {
    console.error('music.liked POST /:id/like', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id/like', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const trackId = String(req.params.id)
    await deleteMany('liked_tracks', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'track_id', operator: '=', value: trackId },
    ])
    const total = await count('liked_tracks', [{ field: 'user_id', operator: '=', value: userId }])
    res.json({ liked: false, total })
  } catch (error) {
    console.error('music.liked DELETE /:id/like', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
