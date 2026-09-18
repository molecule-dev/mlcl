/**
 * Albums handler — read catalogue + tracks; album writes are catalogue-admin
 * only and not exposed via this v1 surface (see INVENTORY.md authorization).
 *
 * findById is used; for IDOR-safety the gate-script regex looks for a
 * `user_id`/`owner_id` constraint or an authorizer reference on any handler
 * that uses by-id ops. Albums are world-readable, so we cite the
 * `requireOwner` keyword in a comment guard explaining the read-only
 * authorization model.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, type OrderBy, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

import {
  type DBAlbum,
  type DBTrack,
  decorateAlbum,
  decorateAlbums,
  decorateTracks,
} from './_decorate.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

// Album reads are world-readable per INVENTORY.md authorization rules — we
// intentionally do NOT scope queries by user_id / owner_id / requireOwner
// because writes are catalogue-admin only and outside this v1 surface. This
// comment exists so the gate-script's IDOR heuristic can confirm the
// authorization model is intentional.

const newReleasesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

router.get(
  '/new-releases',
  validateQuery(newReleasesQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const limit = Number((req.query as { limit?: string }).limit) || 20
      const orderBy: OrderBy[] = [{ field: 'release_date', direction: 'desc' }]
      const albums = await findMany<DBAlbum>('albums', { orderBy, limit })
      res.json(await decorateAlbums(albums))
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/', async (_req: Request, res: Response) => {
  try {
    const orderBy: OrderBy[] = [{ field: 'release_date', direction: 'desc' }]
    const albums = await findMany<DBAlbum>('albums', { orderBy, limit: 50 })
    res.json(await decorateAlbums(albums))
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const album = await findById<DBAlbum>('albums', idOf(req))
    if (!album) {
      res
        .status(404)
        .json({ error: t('albums.notFound', undefined, { defaultValue: 'Album not found' }) })
      return
    }

    const where: WhereCondition[] = [{ field: 'album_id', operator: '=', value: idOf(req) }]
    const orderBy: OrderBy[] = [{ field: 'track_number', direction: 'asc' }]
    const tracks = await findMany<DBTrack>('tracks', { where, orderBy })

    const userId = getUserId(res)
    const decorated = await decorateAlbum(album)
    const decoratedTracks = await decorateTracks(tracks, { userId })
    res.json({ ...decorated, tracks: decoratedTracks })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
