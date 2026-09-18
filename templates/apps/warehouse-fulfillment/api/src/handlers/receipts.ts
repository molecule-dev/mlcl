import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const createReceiptSchema = z.object({
  supplier: z.string().min(1),
  expected_at: z.string().datetime().nullable().optional(),
  status: z.enum(['expected', 'received', 'closed']).default('expected'),
  po_number: z.string().nullable().optional(),
  expected_units: z.number().int().nonnegative().nullable().optional(),
  items: z
    .array(
      z.object({
        product_variant_id: z.string().nullable().optional(),
        expected_qty: z.number().int().nonnegative().default(0),
      }),
    )
    .optional(),
})

const updateReceiptSchema = z.object({
  status: z.enum(['expected', 'received', 'closed']).optional(),
  received_at: z.string().datetime().nullable().optional(),
})

const receiveItemSchema = z.object({
  received_qty: z.number().int().nonnegative(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const rows = await findMany('receipts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(rows)
  } catch (error) {
    logger.error('receipts.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const receipt = await findById<Record<string, unknown>>('receipts', id)
    if (!receipt) {
      return res
        .status(404)
        .json({ error: t('receipts.notFound', {}, { defaultValue: 'Receipt not found' }) })
    }
    if (receipt.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const items = await findMany('receipt_items', {
      where: [{ field: 'receipt_id', operator: '=', value: id }],
    })
    res.json({ ...receipt, items })
  } catch (error) {
    logger.error('receipts.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = createReceiptSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const data = parsed.data
    const result = await create<Record<string, unknown>>('receipts', {
      user_id: userId,
      supplier: data.supplier,
      expected_at: data.expected_at ?? null,
      status: data.status,
      po_number: data.po_number ?? null,
      expected_units: data.expected_units ?? 0,
      created_at: new Date(),
    })

    if (result.data && data.items && data.items.length > 0) {
      for (const item of data.items) {
        await create('receipt_items', {
          user_id: userId,
          receipt_id: result.data.id as string,
          product_variant_id: item.product_variant_id ?? null,
          expected_qty: item.expected_qty,
          received_qty: 0,
          created_at: new Date(),
        })
      }
    }

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('receipts.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('receipts', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('receipts.notFound', {}, { defaultValue: 'Receipt not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateReceiptSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.received_at !== undefined) updates.received_at = parsed.data.received_at

    const result = await updateById('receipts', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('receipts.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/items/:id/receive', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const item = await findById<Record<string, unknown>>('receipt_items', id)
    if (!item) {
      return res
        .status(404)
        .json({ error: t('receipts.itemNotFound', {}, { defaultValue: 'Receipt item not found' }) })
    }
    if (item.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = receiveItemSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const result = await updateById('receipt_items', id, {
      received_qty: parsed.data.received_qty,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('receipts.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
