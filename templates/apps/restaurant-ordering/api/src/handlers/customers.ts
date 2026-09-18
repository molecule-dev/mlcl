import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
})

const updateCustomerSchema = createCustomerSchema.partial()

router.get('/', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.search) {
    where.push({ field: 'name', operator: 'ilike', value: String(req.query.search) })
  }
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
  const customers = await findMany<Record<string, unknown>>('customers', {
    where,
    limit,
    offset: (page - 1) * limit,
    orderBy: [{ field: 'last_visit_at', direction: 'desc' }],
  })
  const total = await count('customers', where)
  res.json({ data: customers, total, page, limit })
})

router.get('/:id', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const customer = await findById<Record<string, unknown>>('customers', req.params.id)
  if (!customer || (customer.user_id && customer.user_id !== userId)) {
    res
      .status(404)
      .json({ error: t('customers.notFound', {}, { defaultValue: 'Customer not found' }) })
    return
  }
  // Recent orders for this customer
  const recentOrders = await findMany<Record<string, unknown>>('orders', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'customer_id', operator: '=', value: req.params.id },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 25,
  })
  res.json({ ...customer, recentOrders })
})

router.post('/', validateBody(createCustomerSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createCustomerSchema>
  const result = await create<Record<string, unknown>>('customers', {
    user_id: userId,
    name: body.name,
    email: body.email ?? null,
    phone: body.phone ?? null,
    total_visits: 0,
    total_spent: 0,
  })
  res.status(201).json(result.data)
})

router.put('/:id', validateBody(updateCustomerSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<Record<string, unknown>>('customers', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('customers.notFound', {}, { defaultValue: 'Customer not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateCustomerSchema>
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.email !== undefined) updates.email = body.email
  if (body.phone !== undefined) updates.phone = body.phone
  const result = await updateById<Record<string, unknown>>('customers', id, updates)
  res.json(result.data)
})

router.delete('/:id', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<Record<string, unknown>>('customers', id)
  if (!existing) {
    res.status(204).end()
    return
  }
  if (existing.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  await deleteById('customers', id)
  res.status(204).end()
})

export default router
