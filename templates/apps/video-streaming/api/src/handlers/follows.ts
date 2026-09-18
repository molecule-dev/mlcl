/**
 * Follows handler — channel subscriptions.
 *
 * A follow row links a follower (`followerId`) to a `(targetType,targetId)`.
 * Per INVENTORY: each user can subscribe to many channels; the rail on
 * `/subscriptions` lists the latest published video from each subscribed
 * channel.
 *
 * Backed by the molecule-shipped `follows` table (camelCase columns:
 * `followerId`, `targetType`, `targetId`). Channel subscriptions use
 * `targetType='channel'`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const subscribeSchema = z.object({
  channel_id: z.string().uuid(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [
      { field: 'followerId', operator: '=', value: userId },
      { field: 'targetType', operator: '=', value: 'channel' },
    ]
    const rows = await findMany<Record<string, unknown>>('follows', { where, limit: 200 })
    // Project a `channel_id` field for the convenience of clients without
    // changing the underlying schema.
    const projected = rows.map((row) => ({
      ...row,
      channel_id: row.targetId,
    }))
    res.json(projected)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(subscribeSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { channel_id } = req.body as z.infer<typeof subscribeSchema>
    const channel = await findById<Record<string, unknown>>('channels', channel_id)
    if (!channel) {
      res
        .status(404)
        .json({ error: t('channels.notFound', undefined, { defaultValue: 'Channel not found' }) })
      return
    }
    const existing = await findMany<Record<string, unknown>>('follows', {
      where: [
        { field: 'followerId', operator: '=', value: userId },
        { field: 'targetType', operator: '=', value: 'channel' },
        { field: 'targetId', operator: '=', value: channel_id },
      ],
      limit: 1,
    })
    if (existing[0]) {
      res.json({ ...existing[0], channel_id: existing[0].targetId })
      return
    }
    const result = await create<Record<string, unknown>>('follows', {
      followerId: userId,
      targetType: 'channel',
      targetId: channel_id,
    })
    await updateById('channels', channel_id, {
      subscriber_count: ((channel.subscriber_count as number) ?? 0) + 1,
    })
    const row = (result.data ?? result) as Record<string, unknown>
    res.status(201).json({ ...row, channel_id: row.targetId ?? channel_id })
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const found = await findMany<Record<string, unknown>>('follows', {
      where: [
        { field: 'id', operator: '=', value: idOf(req) },
        { field: 'followerId', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (!found[0]) {
      res.status(404).json({
        error: t('follows.notFound', undefined, { defaultValue: 'Subscription not found' }),
      })
      return
    }
    await deleteById('follows', idOf(req))
    if (found[0].targetType === 'channel') {
      const channel = await findById<Record<string, unknown>>(
        'channels',
        found[0].targetId as string,
      )
      if (channel) {
        await updateById('channels', found[0].targetId as string, {
          subscriber_count: Math.max(0, ((channel.subscriber_count as number) ?? 0) - 1),
        })
      }
    }
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
