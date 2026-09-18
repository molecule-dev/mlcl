/**
 * Channels handler — public read; owner-only write.
 *
 * A user can own multiple channels (separate `channels` table per INVENTORY).
 * Public-facing reads return the channel record + a list of published videos.
 *
 * Authorization model:
 *   - GET /channels and GET /channels/:id and GET /channels/:id/videos:
 *     auth required (per app convention) but no ownership check; the channel
 *     surface is world-readable to authenticated users.
 *   - POST/PATCH/DELETE: owner-only.
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
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const createChannelSchema = z.object({
  name: z.string().min(1).max(120),
  handle: z.string().min(2).max(60).optional(),
  bio: z.string().max(2000).optional(),
  banner_url: z.string().url().optional(),
  avatar_url: z.string().url().optional(),
})

const updateChannelSchema = createChannelSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const channels = await findMany('channels', {
      orderBy: [{ field: 'subscriber_count', direction: 'desc' }],
      limit: 100,
    })
    res.json(channels)
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
    const channel = await findById('channels', idOf(req))
    if (!channel) {
      res
        .status(404)
        .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
      return
    }
    const where: WhereCondition[] = [
      { field: 'channel_id', operator: '=', value: idOf(req) },
      { field: 'status', operator: '=', value: 'published' },
    ]
    const orderBy: OrderBy[] = [{ field: 'published_at', direction: 'desc' }]
    const videos = await findMany('videos', { where, orderBy, limit: 50 })
    res.json({ ...channel, videos })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id/popular', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [
      { field: 'channel_id', operator: '=', value: idOf(req) },
      { field: 'status', operator: '=', value: 'published' },
    ]
    const orderBy: OrderBy[] = [{ field: 'view_count', direction: 'desc' }]
    const videos = await findMany('videos', { where, orderBy, limit: 20 })
    res.json(videos)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createChannelSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createChannelSchema>
    const result = await create('channels', {
      owner_id: userId,
      user_id: userId,
      name: body.name,
      handle: body.handle ?? null,
      bio: body.bio ?? null,
      banner_url: body.banner_url ?? null,
      avatar_url: body.avatar_url ?? null,
      subscriber_count: 0,
      created_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateChannelSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('channels', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
        return
      }
      if (existing.owner_id !== userId) {
        res
          .status(403)
          .json({ error: t('channels.forbidden', undefined, { defaultValue: 'Not your channel' }) })
        return
      }
      const body = req.body as z.infer<typeof updateChannelSchema>
      const result = await updateById('channels', idOf(req), { ...body })
      res.json(result.data ?? result)
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
    const existing = await findById<Record<string, unknown>>('channels', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
      return
    }
    if (existing.owner_id !== userId) {
      res
        .status(403)
        .json({ error: t('channels.forbidden', undefined, { defaultValue: 'Not your channel' }) })
      return
    }
    await deleteById('channels', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
