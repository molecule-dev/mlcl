/**
 * Notification handlers — owner-scoped feed of activity rows.
 *
 * The richer fan-out engine (subscriptions, channel preferences, push)
 * lives in `@molecule/api-resource-notification` — this handler just
 * exposes the per-user feed for the Notifications page.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  updateMany,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/** Lazy-seed a small welcome inbox the first time a user lists notifications.
 *  Without this every fresh signup sees an empty list and the markAllRead /
 *  markRead invariants are unobservable. We seed once per user, gated on
 *  count===0 so it is naturally idempotent. */
async function seedWelcomeForUser(userId: string): Promise<void> {
  const total = await count('notifications', [{ field: 'user_id', operator: '=', value: userId }])
  if (total > 0) return
  const now = new Date()
  await create('notifications', {
    user_id: userId,
    type: 'mention',
    title: 'Welcome to Calcite',
    body: 'You\u2019re all set. Create your first workbook from the Workbooks tab or pick a starting point in Templates.',
    data: { route: '/workbooks' },
    read_at: null,
    created_at: now,
  })
  await create('notifications', {
    user_id: userId,
    type: 'share',
    title: 'Tip: invite teammates',
    body: 'Open the Team page to send a workspace invite. Editor + Viewer roles are honoured per workbook.',
    data: { route: '/team' },
    read_at: null,
    created_at: new Date(now.getTime() - 60_000),
  })
  await create('notifications', {
    user_id: userId,
    type: 'automation',
    title: 'Automations are on',
    body: 'Schedule when-this-then-that triggers across any workbook from the Automations page.',
    data: { route: '/automations' },
    read_at: null,
    created_at: new Date(now.getTime() - 120_000),
  })
}

const router = Router()

const idParam = z.object({ id: z.string().uuid() })

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  read_at: string | null
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    await seedWelcomeForUser(ownerId)
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: ownerId }]
    if (req.query.unread === 'true') {
      where.push({ field: 'read_at', operator: 'is_null' })
    }
    const items = await findMany<NotificationRow>('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Math.min(Number(req.query.limit) || 100, 500),
    })
    res.json(items)
  } catch (err) {
    console.error('[notifications] list failed', err)
    res.status(500).json({
      error: t('notification.error.list', {}, { defaultValue: 'Failed to list notifications' }),
    })
  }
})

router.get('/unread-count', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    await seedWelcomeForUser(ownerId)
    const total = await count('notifications', [
      { field: 'user_id', operator: '=', value: ownerId },
      { field: 'read_at', operator: 'is_null' },
    ])
    res.json({ count: total })
  } catch (err) {
    console.error('[notifications] count failed', err)
    res
      .status(500)
      .json({ error: t('notification.error.count', {}, { defaultValue: 'Failed to read count' }) })
  }
})

router.post('/mark-all-read', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    await updateMany(
      'notifications',
      [
        { field: 'user_id', operator: '=', value: ownerId },
        { field: 'read_at', operator: 'is_null' },
      ],
      { read_at: new Date() },
    )
    res.json({ updated: true })
  } catch (error) {
    logger.error('notification.markAllRead', error)
    res.status(500).json({
      error: t(
        'notification.error.markAll',
        {},
        { defaultValue: 'Failed to mark notifications as read' },
      ),
    })
  }
})

router.patch('/:id/read', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const owned = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
      return
    }
    const result = await updateById<NotificationRow>('notifications', id.data.id, {
      read_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('notification.markRead', error)
    res
      .status(500)
      .json({ error: t('notification.error.read', {}, { defaultValue: 'Failed to mark as read' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const owned = await findOne<NotificationRow>('notifications', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'user_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
      return
    }
    await deleteById('notifications', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('notification.delete', error)
    res.status(500).json({
      error: t('notification.error.delete', {}, { defaultValue: 'Failed to delete notification' }),
    })
  }
})

export default router
