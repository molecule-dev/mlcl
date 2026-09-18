/**
 * Per-user notifications feed (mention / reply / vote events).
 *
 * Owner-only end-to-end (IDOR scope marker `requireOwner` + `user_id`).
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import {
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  unreadOnly: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((v) => v === true || v === 'true' || v === '1'),
})

// NOTE: the recipient (`user_id`) is intentionally NOT a client-supplied
// field. It is always forced to the session user server-side (see POST `/`),
// so a caller can never inject a notification into another user's feed.
const createNotificationSchema = z.object({
  kind: z.enum(['reply', 'mention', 'vote']),
  link_id: z.string().nullable().optional(),
  comment_id: z.string().nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

function requireSession(res: Response): string | null {
  const userId = getSession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

function requireOwner<T extends Record<string, unknown>>(
  res: Response,
  resource: T | null,
  ownerField: keyof T = 'user_id' as keyof T,
): string | null {
  if (!resource) {
    res.status(404).json({
      error: t('notifications.notFound', {}, { defaultValue: 'Notification not found' }),
    })
    return null
  }
  const userId = requireSession(res)
  if (!userId) return null
  const owner = String(resource[ownerField] ?? '')
  if (owner !== userId) {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return userId
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const { page, limit, unreadOnly } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (unreadOnly) where.push({ field: 'read_at', operator: 'is_null' })
    const items = await findMany('notifications', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ data: items, page, limit })
  } catch (error) {
    logger.error('notifications.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createNotificationSchema), async (req: Request, res: Response) => {
  // Self-targeted only. The recipient is ALWAYS the session user — clients
  // cannot specify a `target_user_id`, so this route can never be used to
  // spoof/flood another user's notification feed (CWE-639 write-side IDOR /
  // mass-assignment of recipient). Genuine cross-user events (reply/mention/
  // vote) must be enqueued by an in-process server-side trigger that derives
  // the recipient from the owner of the acted-on resource — never from the
  // request body on this user-facing route.
  try {
    const userId = requireSession(res)
    if (!userId) return
    const { kind, link_id, comment_id, payload } = req.body as z.infer<
      typeof createNotificationSchema
    >
    const result = await create('notifications', {
      user_id: userId,
      kind,
      actor_id: userId,
      link_id: link_id ?? null,
      comment_id: comment_id ?? null,
      payload: JSON.stringify(payload ?? {}),
      created_at: new Date().toISOString(),
    })
    res.status(201).json(result.data ?? null)
  } catch (error) {
    logger.error('notifications.create', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

async function markRead(id: string, res: Response): Promise<void> {
  const existing = await findById('notifications', id)
  const userId = requireOwner(res, existing as Record<string, unknown> | null)
  if (!userId) return
  const result = await updateById('notifications', id, {
    read_at: new Date().toISOString(),
  })
  res.json(result.data ?? null)
}

router.patch('/:id/read', async (req: Request, res: Response) => {
  try {
    await markRead(String(req.params.id), res)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// POST alias for clients that prefer non-PATCH actions.
router.post('/:id/read', async (req: Request, res: Response) => {
  try {
    await markRead(String(req.params.id), res)
  } catch (error) {
    logger.error('notifications.markRead', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Mark every unread notification belonging to the session user as read.
// Returns `{ data: { count }}` so the UI can show "3 read" feedback.
router.post('/read-all', async (_req: Request, res: Response) => {
  try {
    const userId = requireSession(res)
    if (!userId) return
    const unread = await findMany<Record<string, unknown>>('notifications', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'read_at', operator: 'is_null' },
      ],
    })
    const now = new Date().toISOString()
    for (const n of unread) {
      await updateById('notifications', String(n.id ?? ''), { read_at: now })
    }
    res.json({ data: { count: unread.length } })
  } catch (error) {
    logger.error('notifications.markAllRead', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const existing = await findById('notifications', id)
    const userId = requireOwner(res, existing as Record<string, unknown> | null)
    if (!userId) return
    await deleteById('notifications', id)
    res.status(204).end()
  } catch (error) {
    logger.error('notifications.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
