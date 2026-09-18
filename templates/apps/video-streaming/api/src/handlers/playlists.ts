/**
 * Playlists handler — owner-edits, public-reads when is_public.
 *
 * Authorization: every by-id mutation checks `playlist.owner_id === userId`.
 * Reads on private playlists 404 to non-owners.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)
const videoIdOf = (req: Request): string => String(req.params.videoId)

const idAndVideoParamSchema = z.object({
  id: z.string().uuid(),
  videoId: z.string().uuid(),
})
const listQuerySchema = z.object({ user: z.string().uuid().optional() })

const createPlaylistSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  is_public: z.boolean().optional(),
})

const addVideoSchema = z.object({ video_id: z.string().uuid() })

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const targetUser = (req.query.user as string | undefined) ?? userId
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: targetUser }]
    if (targetUser !== userId) {
      where.push({ field: 'is_public', operator: '=', value: true })
    }
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const playlists = await findMany('playlists', { where, orderBy })
    res.json(playlists)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const playlist = await findById<Record<string, unknown>>('playlists', idOf(req))
    if (!playlist) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }
    const isOwner = playlist.owner_id === userId
    if (!playlist.is_public && !isOwner) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'playlist_id', operator: '=', value: idOf(req) }]
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const items = await findMany<Record<string, unknown>>('playlist_videos', { where, orderBy })
    // Hydrate each playlist_videos row with the underlying video record so
    // the frontend gets title/channel_name/duration_seconds without a
    // second N+1 round-trip per item.
    type HydratedVideo = Record<string, unknown> & { position: unknown; added_at: unknown }
    const videos = await Promise.all(
      items.map(async (item): Promise<HydratedVideo | null> => {
        const vid = await findById<Record<string, unknown>>('videos', String(item.video_id))
        if (!vid) return null
        return {
          ...vid,
          position: item.position,
          added_at: item.added_at,
        }
      }),
    )
    const hydrated = videos.filter((v): v is HydratedVideo => v !== null)
    res.json({ ...playlist, videos: hydrated })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createPlaylistSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { name, description, is_public } = req.body as z.infer<typeof createPlaylistSchema>
    const result = await create('playlists', {
      user_id: userId,
      owner_id: userId,
      name,
      description: description ?? null,
      is_public: is_public !== false,
      cover_video_id: null,
      video_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/videos',
  validateParams(idParamSchema),
  validateBody(addVideoSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const playlist = await findById<Record<string, unknown>>('playlists', idOf(req))
      if (!playlist) {
        res.status(404).json({
          error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }),
        })
        return
      }
      if (playlist.owner_id !== userId) {
        res.status(403).json({
          error: t('playlists.forbidden', undefined, { defaultValue: 'Not your playlist' }),
        })
        return
      }
      const { video_id } = req.body as z.infer<typeof addVideoSchema>
      const video = await findById('videos', video_id)
      if (!video) {
        res
          .status(404)
          .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
        return
      }
      await create('playlist_videos', {
        playlist_id: idOf(req),
        video_id,
        position: ((playlist.video_count as number) ?? 0) + 1,
        added_at: new Date(),
      })
      await updateById('playlists', idOf(req), {
        video_count: ((playlist.video_count as number) ?? 0) + 1,
        cover_video_id: playlist.cover_video_id ?? video_id,
        updated_at: new Date(),
      })
      res.status(201).json({ added: true })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/:id/videos/:videoId',
  validateParams(idAndVideoParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const playlist = await findById<Record<string, unknown>>('playlists', idOf(req))
      if (!playlist) {
        res.status(404).json({
          error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }),
        })
        return
      }
      if (playlist.owner_id !== userId) {
        res.status(403).json({
          error: t('playlists.forbidden', undefined, { defaultValue: 'Not your playlist' }),
        })
        return
      }
      const items = await findMany<Record<string, unknown>>('playlist_videos', {
        where: [
          { field: 'playlist_id', operator: '=', value: idOf(req) },
          { field: 'video_id', operator: '=', value: videoIdOf(req) },
        ],
        limit: 1,
      })
      if (items[0]) {
        await deleteById('playlist_videos', items[0].id as string)
        await updateById('playlists', idOf(req), {
          video_count: Math.max(0, ((playlist.video_count as number) ?? 0) - 1),
          updated_at: new Date(),
        })
      }
      res.json({ removed: true })
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('playlists', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }
    if (existing.owner_id !== userId) {
      res
        .status(403)
        .json({ error: t('playlists.forbidden', undefined, { defaultValue: 'Not your playlist' }) })
      return
    }
    await deleteById('playlists', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
