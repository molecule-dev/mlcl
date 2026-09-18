/**
 * Notifications endpoints — list, mark read, mark all read.
 *
 * - DataStore via @molecule/api-database (no raw SQL).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { count, create, deleteMany, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  filter: z.enum(['all', 'unread']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

const createBodySchema = z.object({
  type: z.enum(['reminder', 'due', 'mastery', 'digest', 'tip']).optional(),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  href: z.string().max(500).optional(),
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
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (q.filter === 'unread') {
      where.push({ field: 'unread', operator: '=', value: true })
    }
    const items = await findMany('notifications', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: q.limit ?? 50,
    })
    const unreadCount = await count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ])
    res.json({ data: items, unread_count: unreadCount })
  },
)

router.post(
  '/',
  validateBody(createBodySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createBodySchema>
    const result = await create('notifications', {
      user_id: userId,
      type: body.type ?? 'tip',
      title: body.title,
      body: body.body,
      href: body.href ?? null,
      unread: true,
    })
    res.status(201).json(result.data)
  },
)

router.post(
  '/:id/read',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = String(req.params.id)
    // Scope the write to the caller's OWN notification (mirrors the DELETE
    // handler below). updateById is keyed purely by primary key, so an
    // unscoped mark-read would both mutate AND leak (via the returned row)
    // any other tenant's notification — an IDOR. Filtering by id + user_id
    // makes the update a no-op for rows the caller doesn't own; we 404 on
    // no-op and never return the row.
    const result = await updateMany(
      'notifications',
      [
        { field: 'id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      { unread: false },
    )
    if (!result.affected) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Not found.' }),
      })
      return
    }
    res.status(204).end()
  },
)

router.post('/read-all', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  await updateMany(
    'notifications',
    [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ],
    { unread: false },
  )
  res.status(204).end()
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
    const id = String(req.params.id)
    await deleteMany('notifications', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
