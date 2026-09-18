import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const createReturnSchema = z.object({
  original_order_id: z.string().nullable().optional(),
  rma_number: z.string().nullable().optional(),
  reason: z.string().min(1),
  status: z.enum(['issued', 'in_transit', 'received', 'refunded', 'closed']).default('issued'),
  items: z
    .array(
      z.object({
        product_variant_id: z.string().nullable().optional(),
        quantity: z.number().int().positive().default(1),
        condition: z.enum(['resellable', 'damaged', 'disposed']).default('resellable'),
      }),
    )
    .optional(),
})

const updateReturnSchema = z.object({
  status: z.enum(['issued', 'in_transit', 'received', 'refunded', 'closed']).optional(),
  received_at: z.string().datetime().nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const rows = await findMany('returns', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(rows)
  } catch (error) {
    logger.error('returns.handler', error)
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
    const row = await findById<Record<string, unknown>>('returns', id)
    if (!row) {
      return res
        .status(404)
        .json({ error: t('returns.notFound', {}, { defaultValue: 'Return not found' }) })
    }
    if (row.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const items = await findMany('return_items', {
      where: [{ field: 'return_id', operator: '=', value: id }],
    })
    res.json({ ...row, items })
  } catch (error) {
    logger.error('returns.handler', error)
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

    const parsed = createReturnSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const data = parsed.data
    const result = await create<Record<string, unknown>>('returns', {
      user_id: userId,
      original_order_id: data.original_order_id ?? null,
      rma_number: data.rma_number ?? `RMA-${Date.now().toString(36).toUpperCase()}`,
      reason: data.reason,
      status: data.status,
      created_at: new Date(),
    })

    if (result.data && data.items && data.items.length > 0) {
      for (const item of data.items) {
        await create('return_items', {
          user_id: userId,
          return_id: result.data.id as string,
          product_variant_id: item.product_variant_id ?? null,
          quantity: item.quantity,
          condition: item.condition,
          created_at: new Date(),
        })
      }
    }

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('returns.handler', error)
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
    const existing = await findById<Record<string, unknown>>('returns', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('returns.notFound', {}, { defaultValue: 'Return not found' }) })
    }
    if (existing.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = updateReturnSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (parsed.data.status !== undefined) updates.status = parsed.data.status
    if (parsed.data.received_at !== undefined) updates.received_at = parsed.data.received_at

    const result = await updateById('returns', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('returns.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
