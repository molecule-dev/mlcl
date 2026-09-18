/**
 * In-app notifications feed — owner-scoped via `user_id`. Read-only for the
 * end user; system processes (cron alert evaluator, billing webhook handler,
 * etc.) insert rows directly via the @molecule/api-database bond.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  updateMany,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const markReadSchema = z.object({
  read: z.boolean().default(true),
})

// Generate a small starter feed of demo notifications keyed off the seeded
// product catalog. Idempotent — only runs when the user has none.
const seedStarterNotifications = async (userId: string): Promise<void> => {
  const products = await findMany<Record<string, unknown>>('products', {
    where: [{ field: 'status', operator: '=', value: 'active' }],
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    limit: 8,
  })
  if (products.length === 0) return
  const sources = await findMany<Record<string, unknown>>('sources', {
    where: [{ field: 'status', operator: '=', value: 'active' }],
    limit: 5,
  })
  const sourceName = (idx: number): string =>
    (sources[idx % sources.length]?.name as string) ?? 'Amazon'
  const kinds = ['drop', 'alert', 'restock', 'rise', 'drop', 'alert', 'restock'] as const
  for (let i = 0; i < Math.min(products.length, 7); i++) {
    const p = products[i]
    const kind = kinds[i]
    const list = Number(p.price ?? 0)
    const best = Number(p.best_price ?? list)
    const old_price_cents = list
    const new_price_cents = kind === 'rise' ? Math.round(best * 1.08) : best
    const created_at = new Date(Date.now() - (i + 1) * 1000 * 60 * 60 * 6)
    await create('notifications', {
      user_id: userId,
      type: kind,
      payload: {
        product_id: p.id,
        product_name: p.name,
        retailer: sourceName(i),
        old_price_cents,
        new_price_cents,
      },
      read_at: null,
      created_at,
    })
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const limit = Math.min(Number(req.query.limit ?? 50), 200)

    let items = await findMany<Record<string, unknown>>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
    })

    if (items.length === 0) {
      await seedStarterNotifications(userId)
      items = await findMany<Record<string, unknown>>('notifications', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
      })
    }

    const unread = await count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'read_at', operator: 'is_null' },
    ])

    res.json({ data: items, unread })
  } catch (error) {
    logger.error('notifications.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(markReadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('notifications', id)

    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }

    const { read } = req.body as z.infer<typeof markReadSchema>
    const updated = await updateById('notifications', id, {
      read_at: read ? new Date() : null,
    })
    res.json(updated.data)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date() },
    )
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('notifications', id)

    if (!item || item.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }

    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
