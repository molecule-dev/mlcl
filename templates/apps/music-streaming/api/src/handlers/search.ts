/**
 * Cross-entity search.
 *
 * GET /api/search?q=...
 *
 * Returns matching artists, albums, tracks, and playlists. The Search
 * page consumes a flat object so the result shape is:
 *
 *   { tracks: ViewTrack[], albums: ViewAlbum[], artists: ViewArtist[], playlists: ViewPlaylist[] }
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

import {
  type DBAlbum,
  type DBArtist,
  type DBPlaylist,
  type DBTrack,
  decorateAlbum,
  decorateArtist,
  decoratePlaylist,
  decorateTracks,
  loadFollowedArtistIds,
  loadSavedPlaylistIds,
} from './_decorate.js'

const router = Router()

const querySchema = z.object({
  q: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

router.get('/', validateQuery(querySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const { q, limit = 10 } = req.query as unknown as z.infer<typeof querySchema>
    const term = String(q).trim()
    if (term.length === 0) {
      res.json({ tracks: [], albums: [], artists: [], playlists: [] })
      return
    }

    const [tracks, albums, artists, playlists] = await Promise.all([
      findMany<DBTrack>('tracks', {
        where: [{ field: 'title', operator: 'ilike', value: term }],
        orderBy: [{ field: 'play_count', direction: 'desc' }],
        limit,
      }),
      findMany<DBAlbum>('albums', {
        where: [{ field: 'title', operator: 'ilike', value: term }],
        orderBy: [{ field: 'release_date', direction: 'desc' }],
        limit,
      }),
      findMany<DBArtist>('artists', {
        where: [{ field: 'name', operator: 'ilike', value: term }],
        orderBy: [{ field: 'monthly_listeners', direction: 'desc' }],
        limit,
      }),
      findMany<DBPlaylist>('playlists', {
        where: [
          { field: 'name', operator: 'ilike', value: term },
          { field: 'is_public', operator: '=', value: true },
        ],
        orderBy: [{ field: 'updated_at', direction: 'desc' }],
        limit,
      }),
    ])

    const followed = await loadFollowedArtistIds(userId)
    const saved = await loadSavedPlaylistIds(userId)

    const view = {
      tracks: await decorateTracks(tracks, { userId }),
      albums: await Promise.all(albums.map(decorateAlbum)),
      artists: await Promise.all(artists.map((a) => decorateArtist(a, { followedSet: followed }))),
      playlists: await Promise.all(playlists.map((p) => decoratePlaylist(p, { savedSet: saved }))),
    }
    res.json(view)
  } catch (error) {
    console.error('music.search GET /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
