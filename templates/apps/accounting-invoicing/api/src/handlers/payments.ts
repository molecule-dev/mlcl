import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { serializePayment } from '../lib/serialize.js'

type RawPaymentRow = Parameters<typeof serializePayment>[0]

/**
 * Customer payment-against-invoice handler. Distinct from the base
 * scaffold `payments` table (which records subscription IAP receipts);
 * we read/write the `invoice_payments` table instead.
 */
const router = Router()

const createPaymentSchema = z.object({
  invoice_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  amount_cents: z.number(),
  method: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
})

const updatePaymentSchema = z.object({
  invoice_id: z.string().nullable().optional(),
  customer_name: z.string().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  amount_cents: z.number().optional(),
  method: z.string().nullable().optional(),
  reference: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  received_at: z.string().nullable().optional(),
  reconciled: z.boolean().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'received_at', direction: 'desc' }]
    const rows = await findMany<RawPaymentRow>('invoice_payments', { where, orderBy })
    res.json(rows.map(serializePayment))
  } catch (error) {
    logger.error('payments.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<RawPaymentRow>('invoice_payments', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('payments.notFound') })
    }
    res.json(serializePayment(row))
  } catch (error) {
    logger.error('payments.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/', validateBody(createPaymentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const result = await create<RawPaymentRow>('invoice_payments', {
      user_id: userId,
      invoice_id: req.body.invoice_id ?? null,
      customer_name: req.body.customer_name ?? null,
      invoice_number: req.body.invoice_number ?? null,
      amount_cents: req.body.amount_cents,
      method: req.body.method ?? 'manual',
      reference: req.body.reference ?? null,
      status: req.body.status ?? 'received',
      received_at: req.body.received_at ? new Date(req.body.received_at) : new Date(),
      reconciled: false,
      created_at: new Date(),
    })
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    res.status(201).json(serializePayment(result.data))
  } catch (error) {
    logger.error('payments.create', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/:id', validateBody(updatePaymentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoice_payments', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('payments.notFound') })
    }
    const updates: Record<string, unknown> = { ...req.body }
    if (typeof req.body.received_at === 'string')
      updates.received_at = new Date(req.body.received_at)
    const result = await updateById<RawPaymentRow>('invoice_payments', id, updates)
    if (!result.data) return res.status(500).json({ error: t('errors.internalServer') })
    res.json(serializePayment(result.data))
  } catch (error) {
    logger.error('payments.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('invoice_payments', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('payments.notFound') })
    }
    await deleteById('invoice_payments', id)
    res.status(204).end()
  } catch (error) {
    logger.error('payments.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
