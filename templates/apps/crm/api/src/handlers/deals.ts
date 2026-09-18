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

const STAGES = [
  'lead',
  'qualified',
  'proposal',
  'negotiation',
  'closed_won',
  'closed_lost',
] as const

const listQuerySchema = z.object({
  stage: z.enum(STAGES).optional(),
  contact_id: z.string().optional(),
  company_id: z.string().optional(),
  owner_id: z.string().optional(),
  sort: z.string().default('updated_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createSchema = z.object({
  title: z.string().min(1),
  value: z.number().min(0).default(0),
  currency: z.string().default('USD'),
  stage: z.enum(STAGES).default('lead'),
  probability: z.number().min(0).max(100).default(0),
  contact_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  expected_close_date: z.string().nullable().optional(),
})

// Note: do NOT use createSchema.partial() — zod's .partial() preserves the
// .default() wrappers, so a PATCH body of `{ stage: 'closed_won' }` would be
// parsed as `{ stage: 'closed_won', value: 0, currency: 'USD', probability: 0 }`
// and then spread into updateById, silently zeroing the deal's value. The
// explicit per-field schema below applies validation without injecting any
// defaults so partial updates only touch the fields the caller actually sent.
const updateSchema = z.object({
  title: z.string().min(1).optional(),
  value: z.number().min(0).optional(),
  currency: z.string().optional(),
  stage: z.enum(STAGES).optional(),
  probability: z.number().min(0).max(100).optional(),
  contact_id: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  expected_close_date: z.string().nullable().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const { stage, contact_id, company_id, sort, order, limit, offset } =
      req.query as unknown as z.infer<typeof listQuerySchema>
    // owner_id is always scoped to the authenticated user — query-string
    // owner_id overrides are intentionally ignored to avoid IDOR.
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (stage) where.push({ field: 'stage', operator: '=', value: stage })
    if (contact_id) where.push({ field: 'contact_id', operator: '=', value: contact_id })
    if (company_id) where.push({ field: 'company_id', operator: '=', value: company_id })

    const items = await findMany('deals', {
      where,
      orderBy: [{ field: sort, direction: order }],
      limit,
      offset,
    })
    res.json(items)
  } catch (error) {
    console.error(`[crm] deals.ts error:`, error)
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
    const item = await findById<{ owner_id?: string }>('deals', id)
    if (!item)
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    if (item.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    }
    res.json(item)
  } catch (error) {
    console.error(`[crm] deals.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<CrmLimits>({
    limitType: 'maxDeals',
    getLimit: (limits) => limits.maxDeals,
    getCurrent: async (userId) =>
      count('deals', [{ field: 'owner_id', operator: '=', value: userId }]),
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
      const result = await create('deals', {
        ...req.body,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      console.error(`[crm] deals.ts error:`, error)
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
    const existing = await findById<{ owner_id?: string }>('deals', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    }
    const result = await updateById('deals', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!result.data)
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    res.json(result.data)
  } catch (error) {
    console.error(`[crm] deals.ts error:`, error)
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
    const existing = await findById<{ owner_id?: string }>('deals', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('deal.notFound', {}, { defaultValue: 'Deal not found' }) })
    }
    await deleteById('deals', id)
    res.status(204).end()
  } catch (error) {
    console.error(`[crm] deals.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
