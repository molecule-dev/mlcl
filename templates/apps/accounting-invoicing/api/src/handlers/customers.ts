import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { serializeCustomer } from '../lib/serialize.js'

const router = Router()

type RawCustomerRow = Parameters<typeof serializeCustomer>[0]

const createCustomerSchema = z.object({
  company: z.string().nullable().optional(),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  address: z.unknown().optional(),
  payment_terms: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

const updateCustomerSchema = createCustomerSchema.extend({
  ytd_billed_cents: z.number().optional(),
  total_billed_cents: z.number().optional(),
  outstanding_cents: z.number().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'company', direction: 'asc' }]
    const rows = await findMany<RawCustomerRow>('customers', { where, orderBy })
    res.json(rows.map(serializeCustomer))
  } catch (error) {
    logger.error('customers.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<RawCustomerRow>('customers', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('customers.notFound') })
    }
    res.json(serializeCustomer(row))
  } catch (error) {
    logger.error('customers.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createCustomerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    // `address` is a JSONB column — node-postgres needs the value pre-serialised
    // (raw objects/arrays are coerced to PG arrays, which fails on jsonb).
    const { address, ...rest } = req.body
    const result = await create<RawCustomerRow>('customers', {
      ...rest,
      address: address === undefined ? null : JSON.stringify(address),
      user_id: userId,
      tags: req.body.tags ?? [],
      ytd_billed_cents: 0,
      total_billed_cents: 0,
      outstanding_cents: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    res.status(201).json(serializeCustomer(result.data))
  } catch (error) {
    logger.error('customers.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updateCustomerSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('customers', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('customers.notFound') })
    }
    const { address, ...rest } = req.body
    const updates: Record<string, unknown> = { ...rest, updated_at: new Date() }
    if (address !== undefined) updates.address = JSON.stringify(address)
    const result = await updateById<RawCustomerRow>('customers', id, updates)
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    res.json(serializeCustomer(result.data))
  } catch (error) {
    logger.error('customers.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('customers', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('customers.notFound') })
    }
    await deleteById('customers', id)
    res.status(204).end()
  } catch (error) {
    logger.error('customers.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
