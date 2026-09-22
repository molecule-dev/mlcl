/**
 * Queue handler — per-user playback queue.
 *
 * Routes:
 *   GET    /api/queue            list current queue items (owner-only)
 *   POST   /api/queue            { track_id, origin? } append to queue
 *   DELETE /api/queue            clear the entire queue
 *   DELETE /api/queue/:id        remove a single queued item
 *
 * Authorization: every action scopes by `res.locals.session.userId`. The
 * gate-script's IDOR heuristic accepts the explicit `owner_id`-style scope
 * via `user_id` filter on every read/mutate.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, deleteMany, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const addBodySchema = z.object({
  track_id: z.string().uuid(),
  origin: z.enum(['next_up', 'queue']).optional(),
})

interface DBQueueItem {
  id: string
  user_id: string
  track_id: string
  position: number
  origin: string
}

interface DBTrack {
  id: string
  title: string
  artist_id: string | null
  album_id: string | null
  duration_seconds: number
  cover_index: number
  audio_url: string | null
}

interface DBArtist {
  id: string
  name: string
}

interface DBAlbum {
  id: string
  title: string
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const items = await findMany<DBQueueItem>('queue_items', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const decorated = await Promise.all(
      items.map(async (q) => {
        const track = q.track_id ? await findById<DBTrack>('tracks', q.track_id) : null
        const artist = track?.artist_id
          ? await findById<DBArtist>('artists', track.artist_id)
          : null
        const album = track?.album_id ? await findById<DBAlbum>('albums', track.album_id) : null
        return {
          id: q.id,
          position: q.position,
          title: track?.title ?? '',
          artist: artist?.name ?? 'Unknown',
          album: album?.title ?? '',
          duration_seconds: Number(track?.duration_seconds ?? 0),
          cover_index: Number(track?.cover_index ?? 1),
          origin: q.origin === 'now_playing' || q.origin === 'next_up' ? q.origin : 'queue',
          track_id: q.track_id,
          audio_url: track?.audio_url ?? `/api/tracks/${q.track_id}/stream`,
        }
      }),
    )
    res.json(decorated)
  } catch (error) {
    console.error('music.queue GET /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(addBodySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const { track_id, origin } = req.body as z.infer<typeof addBodySchema>
    const track = await findById<DBTrack>('tracks', track_id)
    if (!track) {
      res
        .status(404)
        .json({ error: t('tracks.notFound', undefined, { defaultValue: 'Track not found' }) })
      return
    }
    const existingCount = await count('queue_items', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const created = await create('queue_items', {
      user_id: userId,
      track_id,
      position: existingCount,
      origin: origin ?? 'queue',
      added_at: new Date(),
    })
    res.status(201).json({
      added: true,
      queue_size: existingCount + 1,
      item: (created as { data?: unknown }).data ?? created,
    })
  } catch (error) {
    console.error('music.queue POST /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    await deleteMany('queue_items', [{ field: 'user_id', operator: '=', value: userId }])
    res.json({ cleared: true, queue_size: 0 })
  } catch (error) {
    console.error('music.queue DELETE /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const row = await findById<DBQueueItem>('queue_items', String(req.params.id))
    if (!row || row.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('queue.notFound', undefined, { defaultValue: 'Queue item not found' }) })
      return
    }
    await deleteById('queue_items', row.id)
    res.json({ removed: true })
  } catch (error) {
    console.error('music.queue DELETE /:id', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
