import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { FieldServiceLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'
import { shapeCustomer } from './_shape.js'

const router = Router()

const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
})

const updateCustomerSchema = createCustomerSchema.partial()

router.use(authorizers.auth())

// List customers — owner-scoped. Seeds demo data on first authenticated call.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)
    const { search, page = '1', limit = '100' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]

    const customers = await findMany('customers', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    let shaped = customers.map((c) => shapeCustomer(c as Record<string, unknown>))
    const q = search ? String(search).trim().toLowerCase() : ''
    if (q) {
      shaped = shaped.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q),
      )
    }
    res.json(shaped)
  } catch (err) {
    logger.error('[customers] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get customer details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('customers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('customers.notFound', {}, { defaultValue: 'Customer not found' }),
      })
      return
    }
    res.json(shapeCustomer(check.row as Record<string, unknown>))
  } catch (err) {
    logger.error('[customers] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create customer — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<FieldServiceLimits>({
    limitType: 'maxCustomers',
    getLimit: (limits) => limits.maxCustomers,
    getCurrent: async (userId) =>
      count('customers', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createCustomerSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createCustomerSchema>
      const now = new Date().toISOString()
      const result = await create('customers', {
        owner_id: userId,
        name: body.name,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? '',
        notes: body.notes ?? '',
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(shapeCustomer(result.data as Record<string, unknown>))
    } catch (err) {
      logger.error('[customers] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update customer — owner-only.
router.put('/:id', validateBody(updateCustomerSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('customers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('customers.notFound', {}, { defaultValue: 'Customer not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateCustomerSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.email !== undefined) updates.email = body.email
    if (body.phone !== undefined) updates.phone = body.phone
    if (body.address !== undefined) updates.address = body.address
    if (body.notes !== undefined) updates.notes = body.notes

    const result = await updateById('customers', req.params.id as string, updates)
    res.json(shapeCustomer(result.data as Record<string, unknown>))
  } catch (err) {
    logger.error('[customers] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete customer — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('customers', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('customers.notFound', {}, { defaultValue: 'Customer not found' }),
      })
      return
    }
    await deleteById('customers', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[customers] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
