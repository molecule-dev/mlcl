/**
 * Playlists handler — owner-edits, public-reads when is_public.
 *
 * Authorization: every by-id mutation checks `playlist.owner_id === userId`
 * before proceeding. Reads on private playlists 404 to non-owners (matches
 * GitHub-style "we don't tell you it exists" behaviour).
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { MusicStreamingLimits } from '../tiers.js'
import {
  type DBPlaylist,
  type DBTrack,
  decoratePlaylist,
  decoratePlaylists,
  decorateTracks,
  loadSavedPlaylistIds,
} from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)
const trackIdOf = (req: Request): string => String(req.params.trackId)

const idAndTrackParamSchema = z.object({
  id: z.string().uuid(),
  trackId: z.string().uuid(),
})
const listQuerySchema = z.object({ user: z.string().uuid().optional() })

const createPlaylistSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  is_public: z.boolean().optional(),
})

const addTrackSchema = z.object({ track_id: z.string().uuid() })

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const targetUser = (req.query.user as string | undefined) ?? null
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]

    // Default behaviour: show public playlists (editorial / browseable).
    // Pass ?user=me or a specific user id to scope.
    let where: WhereCondition[]
    if (targetUser === 'me') {
      where = [{ field: 'owner_id', operator: '=', value: userId }]
    } else if (targetUser) {
      where = [
        { field: 'owner_id', operator: '=', value: targetUser },
        { field: 'is_public', operator: '=', value: true },
      ]
    } else {
      where = [{ field: 'is_public', operator: '=', value: true }]
    }

    const playlists = await findMany<DBPlaylist>('playlists', { where, orderBy, limit: 100 })
    res.json(await decoratePlaylists(playlists, { userId }))
  } catch (error) {
    console.error('music.playlists GET /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/saved', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
    })
    return
  }
  try {
    const saves = await findMany<{ playlist_id: string }>('playlist_saves', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (saves.length === 0) {
      res.json([])
      return
    }
    const ids = saves.map((s) => s.playlist_id)
    const playlists = await findMany<DBPlaylist>('playlists', {
      where: [{ field: 'id', operator: 'in', value: ids }],
    })
    res.json(await decoratePlaylists(playlists, { userId }))
  } catch (error) {
    console.error('music.playlists GET /saved', error)
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
    const playlist = await findById<DBPlaylist>('playlists', idOf(req))
    if (!playlist) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }
    // requireOwner authorization: private playlists are 404 to non-owners.
    const isOwner = playlist.owner_id === userId
    if (!playlist.is_public && !isOwner) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }

    const where: WhereCondition[] = [{ field: 'playlist_id', operator: '=', value: idOf(req) }]
    const orderBy: OrderBy[] = [{ field: 'position', direction: 'asc' }]
    const items = await findMany<{ track_id: string; position: number }>('playlist_tracks', {
      where,
      orderBy,
    })

    let trackList: ReturnType<typeof decorateTracks> extends Promise<infer T> ? T : never = []
    if (items.length > 0) {
      const trackIds = items.map((i) => i.track_id)
      const trackRows = await findMany<DBTrack>('tracks', {
        where: [{ field: 'id', operator: 'in', value: trackIds }],
      })
      // Re-order to match playlist position order.
      const byId = new Map(trackRows.map((t) => [t.id, t]))
      const ordered = items.map((i) => byId.get(i.track_id)).filter((t): t is DBTrack => !!t)
      trackList = await decorateTracks(ordered, { userId })
    }

    const savedSet = await loadSavedPlaylistIds(userId)
    const decorated = await decoratePlaylist(playlist, { savedSet })
    res.json({ ...decorated, tracks: trackList })
  } catch (error) {
    console.error('music.playlists GET /:id', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/save', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const playlist = await findById<DBPlaylist>('playlists', idOf(req))
    if (!playlist) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }
    if (!playlist.is_public && playlist.owner_id !== userId) {
      res
        .status(404)
        .json({ error: t('playlists.notFound', undefined, { defaultValue: 'Playlist not found' }) })
      return
    }
    const existing = await findMany('playlist_saves', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'playlist_id', operator: '=', value: idOf(req) },
      ],
      limit: 1,
    })
    if (existing.length === 0) {
      await create('playlist_saves', {
        user_id: userId,
        playlist_id: idOf(req),
        saved_at: new Date(),
      })
    }
    const total = await count('playlist_saves', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(201).json({ saved: true, total })
  } catch (error) {
    console.error('music.playlists POST /:id/save', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id/save', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    await deleteMany('playlist_saves', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'playlist_id', operator: '=', value: idOf(req) },
    ])
    const total = await count('playlist_saves', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json({ saved: false, total })
  } catch (error) {
    console.error('music.playlists DELETE /:id/save', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier playlist cap (tiers.ts maxPlaylists) — defined + shown on Pricing (and
// CATALOG claims it gated) but the create route never enforced it, so any tier made unlimited.
const enforcePlaylistLimit = enforceLimit<MusicStreamingLimits>({
  limitType: 'maxPlaylists',
  getLimit: (limits) => limits.maxPlaylists,
  getCurrent: async (userId) =>
    count('playlists', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforcePlaylistLimit,
  validateBody(createPlaylistSchema),
  async (req: Request, res: Response) => {
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
        description: description || null,
        is_public: is_public !== false,
        cover_image_url: null,
        track_count: 0,
        duration_seconds: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data ?? result)
    } catch (error) {
      console.error('music.playlists POST /', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:id/tracks',
  validateParams(idParamSchema),
  validateBody(addTrackSchema),
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
      // requireOwner authorization: only the playlist owner may add tracks.
      if (playlist.owner_id !== userId) {
        res.status(403).json({
          error: t('playlists.forbidden', undefined, { defaultValue: 'Not your playlist' }),
        })
        return
      }

      const { track_id } = req.body as z.infer<typeof addTrackSchema>
      const track = await findById<Record<string, unknown>>('tracks', track_id)
      if (!track) {
        res
          .status(404)
          .json({ error: t('tracks.notFound', undefined, { defaultValue: 'Track not found' }) })
        return
      }

      await create('playlist_tracks', {
        playlist_id: idOf(req),
        track_id,
        position: ((playlist.track_count as number) ?? 0) + 1,
        added_at: new Date(),
      })

      await updateById('playlists', idOf(req), {
        track_count: ((playlist.track_count as number) ?? 0) + 1,
        duration_seconds:
          ((playlist.duration_seconds as number) ?? 0) + ((track.duration_seconds as number) ?? 0),
        updated_at: new Date(),
      })

      res.status(201).json({ added: true })
    } catch (error) {
      console.error('music.playlists POST /:id/tracks', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/:id/tracks/:trackId',
  validateParams(idAndTrackParamSchema),
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

      const items = await findMany<Record<string, unknown>>('playlist_tracks', {
        where: [
          { field: 'playlist_id', operator: '=', value: idOf(req) },
          { field: 'track_id', operator: '=', value: trackIdOf(req) },
        ],
        limit: 1,
      })

      if (items[0]) {
        await deleteById('playlist_tracks', items[0].id as string)
        await updateById('playlists', idOf(req), {
          track_count: Math.max(0, ((playlist.track_count as number) ?? 0) - 1),
          updated_at: new Date(),
        })
      }

      res.json({ removed: true })
    } catch (error) {
      console.error('music.playlists DELETE /:id/tracks/:trackId', error)
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
    console.error('music.playlists DELETE /:id', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
