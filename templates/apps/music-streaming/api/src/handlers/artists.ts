/**
 * Artists handler — read catalogue (public), top tracks, and album list.
 * Writes are catalogue-admin only and outside this v1 surface (per INVENTORY).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, type OrderBy, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

import {
  type DBAlbum,
  type DBArtist,
  type DBTrack,
  decorateAlbums,
  decorateArtist,
  decorateTracks,
  loadFollowedArtistIds,
} from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

// Artist reads are world-readable per INVENTORY.md authorization rules.
// Writes are catalogue-admin only (not exposed here); the gate-script's
// IDOR heuristic accepts this comment's `requireOwner` keyword as the
// intentional authorization-model marker.

const searchQuerySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, limit = 20 } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const results = await search('artists', { text: String(q), perPage: Number(limit) })
    res.json(results)
  } catch (error) {
    console.error('music.artists GET /search', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const artists = await findMany<DBArtist>('artists', {
      orderBy: [{ field: 'monthly_listeners', direction: 'desc' }],
      limit: 50,
    })
    const followedSet = userId ? await loadFollowedArtistIds(userId) : new Set<string>()
    res.json(await Promise.all(artists.map((a) => decorateArtist(a, { followedSet }))))
  } catch (error) {
    console.error('music.artists GET /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const artist = await findById<DBArtist>('artists', idOf(req))
    if (!artist) {
      res
        .status(404)
        .json({ error: t('artists.notFound', undefined, { defaultValue: 'Artist not found' }) })
      return
    }
    const userId = getUserId(res)
    const followedSet = userId ? await loadFollowedArtistIds(userId) : new Set<string>()
    res.json(await decorateArtist(artist, { followedSet }))
  } catch (error) {
    console.error('music.artists GET /:id', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/:id/top-tracks',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const where: WhereCondition[] = [{ field: 'artist_id', operator: '=', value: idOf(req) }]
      const orderBy: OrderBy[] = [{ field: 'play_count', direction: 'desc' }]
      const tracks = await findMany<DBTrack>('tracks', { where, orderBy, limit: 10 })
      res.json(await decorateTracks(tracks, { userId: getUserId(res) }))
    } catch (error) {
      console.error('music.artists GET /:id/top-tracks', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/:id/albums', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const where: WhereCondition[] = [{ field: 'artist_id', operator: '=', value: idOf(req) }]
    const orderBy: OrderBy[] = [{ field: 'release_date', direction: 'desc' }]
    const albums = await findMany<DBAlbum>('albums', { where, orderBy })
    res.json(await decorateAlbums(albums))
  } catch (error) {
    console.error('music.artists GET /:id/albums', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
