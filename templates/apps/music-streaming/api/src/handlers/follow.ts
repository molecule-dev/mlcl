/**
 * Follow handler — follow/unfollow artists.
 *
 * Routes:
 *   POST   /api/artists/:id/follow   follow (idempotent)
 *   DELETE /api/artists/:id/follow   unfollow (idempotent)
 *   GET    /api/follows              list my followed artist IDs (with names)
 *
 * Owner scope on every read/mutate via `res.locals.session.userId`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router({ mergeParams: true })

interface DBArtist {
  id: string
  name: string
  follower_count: number
}

interface DBFollow {
  id: string
  user_id: string
  artist_id: string
}

router.post(
  '/artists/:id/follow',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    try {
      const artistId = String(req.params.id)
      const artist = await findById<DBArtist>('artists', artistId)
      if (!artist) {
        res
          .status(404)
          .json({ error: t('artists.notFound', undefined, { defaultValue: 'Artist not found' }) })
        return
      }
      const existing = await findMany('artist_follows', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'artist_id', operator: '=', value: artistId },
        ],
        limit: 1,
      })
      if (existing.length === 0) {
        await create('artist_follows', {
          user_id: userId,
          artist_id: artistId,
          followed_at: new Date(),
        })
        await updateById('artists', artistId, {
          follower_count: Number(artist.follower_count ?? 0) + 1,
        })
      }
      const followerCount = await count('artist_follows', [
        { field: 'artist_id', operator: '=', value: artistId },
      ])
      res.status(201).json({ followed: true, follower_count: followerCount })
    } catch (error) {
      console.error('music.follow POST /artists/:id/follow', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/artists/:id/follow',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    try {
      const artistId = String(req.params.id)
      const before = await findMany<DBFollow>('artist_follows', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'artist_id', operator: '=', value: artistId },
        ],
      })
      if (before.length > 0) {
        await deleteMany('artist_follows', [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'artist_id', operator: '=', value: artistId },
        ])
        const artist = await findById<DBArtist>('artists', artistId)
        if (artist) {
          await updateById('artists', artistId, {
            follower_count: Math.max(0, Number(artist.follower_count ?? 0) - 1),
          })
        }
      }
      const followerCount = await count('artist_follows', [
        { field: 'artist_id', operator: '=', value: artistId },
      ])
      res.json({ followed: false, follower_count: followerCount })
    } catch (error) {
      console.error('music.follow DELETE /artists/:id/follow', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.get('/follows', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const follows = await findMany<DBFollow>('artist_follows', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'followed_at', direction: 'desc' }],
    })
    const items = await Promise.all(
      follows.map(async (f) => {
        const a = await findById<DBArtist>('artists', f.artist_id)
        return {
          id: f.id,
          artist_id: f.artist_id,
          artist_name: a?.name ?? 'Unknown',
          follower_count: Number(a?.follower_count ?? 0),
        }
      }),
    )
    res.json(items)
  } catch (error) {
    console.error('music.follow GET /follows', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
