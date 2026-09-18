/**
 * Caregiver invite + permission handlers.
 *
 * - Owner-scoped via `owner_user_id` column — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { randomUUID } from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const permissionEnum = z.enum(['view', 'notify', 'manage'])

const createCaregiverSchema = z.object({
  caregiver_email: z.string().email().max(255),
  permission: permissionEnum.optional(),
})

const updateCaregiverSchema = z.object({
  permission: permissionEnum.optional(),
  caregiver_email: z.string().email().max(255).optional(),
})

const listQuerySchema = z.object({
  permission: permissionEnum.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
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
    const { permission, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_user_id', operator: '=', value: userId }]
    if (permission) where.push({ field: 'permission', operator: '=', value: String(permission) })
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rows = await findMany('caregivers', {
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
    const row = await findById<Record<string, unknown>>('caregivers', idOf(req))
    if (!row || (row.owner_user_id !== userId && row.caregiver_user_id !== userId)) {
      res.status(404).json({
        error: t('caregivers.notFound', undefined, { defaultValue: 'Caregiver not found.' }),
      })
      return
    }
    res.json(row)
  },
)

router.post(
  '/',
  validateBody(createCaregiverSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createCaregiverSchema>
    const result = await create('caregivers', {
      owner_user_id: userId,
      caregiver_email: body.caregiver_email.toLowerCase(),
      caregiver_user_id: null,
      permission: body.permission ?? 'view',
      invite_token: randomUUID(),
      accepted_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCaregiverSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('caregivers', id)
    if (!existing || existing.owner_user_id !== userId) {
      res.status(404).json({
        error: t('caregivers.notFound', undefined, { defaultValue: 'Caregiver not found.' }),
      })
      return
    }
    const result = await updateById('caregivers', id, {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    })
    res.json(result.data)
  },
)

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
    const existing = await findById<Record<string, unknown>>('caregivers', id)
    if (!existing || existing.owner_user_id !== userId) {
      res.status(404).json({
        error: t('caregivers.notFound', undefined, { defaultValue: 'Caregiver not found.' }),
      })
      return
    }
    await deleteMany('caregivers', [
      { field: 'id', operator: '=', value: id },
      { field: 'owner_user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
