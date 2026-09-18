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
  company_id: z.string().optional(),
  sort: z.string().default('updated_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

const createSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  company_id: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
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
    const { search, company_id, sort, order, limit, offset } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (company_id) where.push({ field: 'company_id', operator: '=', value: company_id })
    if (search) where.push({ field: 'first_name', operator: 'ilike', value: search })

    const items = await findMany('contacts', {
      where,
      orderBy: [{ field: sort, direction: order }],
      limit,
      offset,
    })
    res.json(items)
  } catch (error) {
    console.error(`[crm] contacts.ts error:`, error)
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
    const item = await findById<{ owner_id?: string }>('contacts', id)
    if (!item)
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    // Anti-IDOR: owner_id must match the authenticated user's id.
    if (item.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    }
    res.json(item)
  } catch (error) {
    console.error(`[crm] contacts.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  // enforceLimit returns @molecule/api-entitlements' structural RequestHandler
  // whose Request type intentionally has no shared properties with express.Request.
  // Cast through unknown to satisfy express's RequestHandler overload — the
  // runtime contract (req, res, next) is identical.
  enforceLimit<CrmLimits>({
    limitType: 'maxContacts',
    getLimit: (limits) => limits.maxContacts,
    getCurrent: async (userId) =>
      count('contacts', [{ field: 'owner_id', operator: '=', value: userId }]),
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
      const result = await create('contacts', {
        ...req.body,
        owner_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(result.data)
    } catch (error) {
      console.error(`[crm] contacts.ts error:`, error)
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
    const existing = await findById<{ owner_id?: string }>('contacts', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    }
    const result = await updateById('contacts', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    if (!result.data)
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    res.json(result.data)
  } catch (error) {
    console.error(`[crm] contacts.ts error:`, error)
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
    const existing = await findById<{ owner_id?: string }>('contacts', id)
    if (!existing)
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    if (existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('contact.notFound', {}, { defaultValue: 'Contact not found' }) })
    }
    await deleteById('contacts', id)
    res.status(204).end()
  } catch (error) {
    console.error(`[crm] contacts.ts error:`, error)
    res
      .status(500)
      .json({ error: t('error.internal', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
