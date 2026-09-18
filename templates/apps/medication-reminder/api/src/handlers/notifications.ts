/**
 * In-app notification feed handlers — dose reminders, refill alerts,
 * caregiver pings.
 *
 * - Owner-scoped via `user_id` — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const listQuerySchema = z.object({
  read: z.union([z.boolean(), z.enum(['true', 'false'])]).optional(),
  kind: z.string().max(64).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const createNotificationSchema = z.object({
  kind: z.string().min(1).max(64),
  title: z.string().max(255).optional(),
  body: z.string().max(2000).optional(),
  href: z.string().max(500).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
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
    const { read, kind, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (read !== undefined) {
      const flag = typeof read === 'string' ? read === 'true' : read
      where.push({ field: 'read', operator: '=', value: flag })
    }
    if (kind) where.push({ field: 'kind', operator: '=', value: String(kind) })
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rows = await findMany('notifications', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    res.json(rows)
  },
)

router.get(
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
    const row = await findById<Record<string, unknown>>('notifications', idOf(req))
    if (!row || row.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    res.json(row)
  },
)

router.post(
  '/',
  validateBody(createNotificationSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createNotificationSchema>
    const result = await create('notifications', {
      user_id: userId,
      kind: body.kind,
      title: body.title ?? '',
      body: body.body ?? null,
      href: body.href ?? null,
      payload: JSON.stringify(body.payload ?? {}),
      read: false,
      read_at: null,
      created_at: new Date(),
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
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('notifications', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('notifications.notFound', undefined, { defaultValue: 'Notification not found.' }),
      })
      return
    }
    const result = await updateById('notifications', id, {
      read: true,
      read_at: new Date(),
    })
    res.json(result.data)
  },
)

export default router
