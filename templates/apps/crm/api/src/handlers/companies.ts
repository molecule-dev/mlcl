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

const listQuerySchema = z.object({
  search: z.string().optional(),
  industry: z.string().optional(),
  sort: z.string().default('name'),
  order: z.enum(['asc', 'desc']).default('asc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createSchema = z.object({
  name: z.string().min(1),
  domain: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
})

const updateSchema = createSchema.partial()

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required.' }) })
    }
    const { search, industry, sort, order, limit, offset } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (industry) where.push({ field: 'industry', operator: '=', value: industry })
    if (search) where.push({ field: 'name', operator: 'ilike', value: search })

    const items = await findMany('companies', {
      where,
      orderBy: [{ field: sort, direction: order }],
      limit,
      offset,
    })
    res.json(items)
  } catch (error) {
    console.error(`[crm] companies.ts error:`, error)
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
    const item = await findById<{ owner_id?: string }>('companies', id)
    if (!item)
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    if (item.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    }
    const contacts = await findMany('contacts', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'company_id', operator: '=', value: id },
      ],
      orderBy: [{ field: 'last_name', direction: 'asc' }],
    })
    res.json({ ...item, contacts })
  } catch (error) {
    console.error(`[crm] companies.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<CrmLimits>({
    limitType: 'maxCompanies',
    getLimit: (limits) => limits.maxCompanies,
    getCurrent: async (userId) =>
      count('companies', [{ field: 'owner_id', operator: '=', value: userId }]),
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
      const result = await create('companies', {
        ...req.body,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      console.error(`[crm] companies.ts error:`, error)
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
    const existing = await findById<{ owner_id?: string }>('companies', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    }
    const result = await updateById('companies', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!result.data)
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    res.json(result.data)
  } catch (error) {
    console.error(`[crm] companies.ts error:`, error)
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
    const existing = await findById<{ owner_id?: string }>('companies', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('company.notFound', {}, { defaultValue: 'Company not found' }) })
    }
    await deleteById('companies', id)
    res.status(204).end()
  } catch (error) {
    console.error(`[crm] companies.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
