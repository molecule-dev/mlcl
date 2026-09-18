/**
 * Notification handlers — list, mark-read, mark-all-read, create.
 *
 * - Every read/write scopes by user_id (ownership).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const listQuerySchema = z.object({
  unread_only: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const updateSchema = z.object({
  unread: z.boolean(),
})

const createSchema = z.object({
  type: z.enum([
    'reminder',
    'streak_at_risk',
    'streak_broken',
    'milestone',
    'deck_shared',
    'system_message',
  ]),
  title: z.string().min(1).max(255),
  body: z.string().max(2000).optional(),
  href: z.string().max(500).nullable().optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const q = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.unread_only === 'true') {
      where.push({ field: 'unread', operator: '=', value: true })
    }
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const items = await findMany('notifications', {
      where,
      orderBy,
      limit: q.limit ?? 100,
      offset: q.offset ?? 0,
    })
    res.json(items)
  },
)

router.post('/', validateBody(createSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('notifications', {
    user_id: userId,
    type: body.type,
    title: body.title,
    body: body.body ?? '',
    href: body.href ?? null,
    unread: true,
    created_at: new Date(),
  })
  res.status(201).json(result.data)
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    const updates = req.body as z.infer<typeof updateSchema>
    const result = await updateById('notifications', id, { unread: updates.unread })
    res.json(result.data)
  },
)

router.post('/mark-all-read', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  // Best-effort: fetch unread, update each.
  const unread = await findMany<{ id: string }>('notifications', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ],
    limit: 5000,
  })
  let updated = 0
  for (const n of unread) {
    await updateById('notifications', n.id, { unread: false })
    updated += 1
  }
  res.json({ updated })
})

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    await deleteMany('notifications', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
