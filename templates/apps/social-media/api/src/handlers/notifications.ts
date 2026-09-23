import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { deleteById, findById, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { buildAuthor } from '../lib/enrich-posts.js'

const router = Router()

// NOTE: There is intentionally no client-facing POST /notifications route.
// Notifications are emitted *server-side* only — by posts.ts/follows.ts, which
// resolve the recipient (user_id) and actor (actor_id) from the authenticated
// session and the resolved resource owner, never from request body. A standalone
// POST that accepted a body-supplied user_id/actor_id/href let any authenticated
// caller write into another user's inbox and impersonate system messages
// (broken access control). It has been removed. If a self-notification endpoint
// is ever needed, hard-set user_id = getUserId(res) server-side (self only) and
// never trust a client-supplied user_id/actor_id/href.

const updateNotificationSchema = z.object({
  unread: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const notifications = await findMany<{
      id: string
      type: string
      actor_id: string | null
      target_type: string | null
      target_id: string | null
      body: string
      href: string | null
      unread: boolean
      created_at: Date | string
    }>('notifications', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    const actorIds = Array.from(
      new Set(notifications.map((n) => n.actor_id).filter((x): x is string => Boolean(x))),
    )
    const actors =
      actorIds.length > 0
        ? await findMany<{
            id: string
            username: string | null
            name: string | null
            email: string | null
          }>('users', {
            where: [{ field: 'id', operator: 'in', value: actorIds }],
            limit: actorIds.length,
          })
        : []
    const actorMap = new Map(actors.map((u) => [u.id, u]))
    const enriched = notifications.map((n) => {
      const actorRaw = n.actor_id ? (actorMap.get(n.actor_id) ?? null) : null
      const actor = actorRaw ? buildAuthor(actorRaw) : null
      return {
        id: n.id,
        kind: n.type,
        actor,
        also: [],
        post_id: n.target_type === 'post' ? n.target_id : undefined,
        post_cover_index: undefined,
        excerpt: n.body,
        posted_at: n.created_at instanceof Date ? n.created_at.toISOString() : String(n.created_at),
        unread: n.unread,
        href: n.href,
      }
    })
    res.json(enriched)
  } catch (err) {
    logger.error('notifications.list', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const parsed = updateNotificationSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const updates: Record<string, unknown> = {}
    if (parsed.data.unread !== undefined) updates.unread = parsed.data.unread
    // Atomic, ownership-scoped write: only a row owned by the caller is
    // updated, so another tenant's notification is never mutated or disclosed.
    const where: WhereCondition[] = [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ]
    const result = await updateMany('notifications', where, updates)
    if (!result.affected) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }
    const updated = await findById<Record<string, unknown>>('notifications', id)
    res.json(updated)
  } catch (error) {
    logger.error('notifications.putNotification', error)
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
        { field: 'unread', operator: '=', value: true },
      ],
      { unread: false },
    )
    res.json({ ok: true })
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
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('notification.notFound', {}, { defaultValue: 'Notification not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('notification.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.deleteNotification', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
