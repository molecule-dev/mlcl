import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { CrmLimits } from '../tiers.js'

const router = Router()

const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'task', 'note'] as const

const listQuerySchema = z.object({
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  type: z.enum(ACTIVITY_TYPES).optional(),
  sort: z.string().default('due_date'),
  order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createSchema = z.object({
  type: z.enum(ACTIVITY_TYPES),
  subject: z.string().min(1),
  description: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  deal_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
})

const updateSchema = z.object({
  type: z.enum(ACTIVITY_TYPES).optional(),
  subject: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  contact_id: z.string().nullable().optional(),
  deal_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  completed: z.boolean().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const { contact_id, deal_id, type, sort, order, limit, offset } =
      req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (contact_id) where.push({ field: 'contact_id', operator: '=', value: contact_id })
    if (deal_id) where.push({ field: 'deal_id', operator: '=', value: deal_id })
    if (type) where.push({ field: 'type', operator: '=', value: type })

    const items = await findMany('activities', {
      where,
      orderBy: [{ field: sort, direction: order }],
      limit,
      offset,
    })
    res.json(items)
  } catch (error) {
    console.error(`[crm] activities.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const id = req.params.id as string
    const item = await findById<{ owner_id?: string }>('activities', id)
    if (!item)
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    if (item.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    }
    res.json(item)
  } catch (error) {
    console.error(`[crm] activities.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<CrmLimits>({
    limitType: 'maxActivities',
    getLimit: (limits) => limits.maxActivities,
    getCurrent: async (userId) =>
      count('activities', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
      }
      const result = await create('activities', {
        ...req.body,
        completed: false,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      console.error(`[crm] activities.ts error:`, error)
      res
        .status(500)
        .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.patch('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const id = req.params.id as string
    const existing = await findById<{ owner_id?: string }>('activities', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    }
    const result = await updateById('activities', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!result.data)
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    res.json(result.data)
  } catch (error) {
    console.error(`[crm] activities.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const id = req.params.id as string
    const existing = await findById<{ owner_id?: string }>('activities', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('activity.notFound', {}, { defaultValue: 'Activity not found' }) })
    }
    await deleteById('activities', id)
    res.status(204).end()
  } catch (error) {
    console.error(`[crm] activities.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
