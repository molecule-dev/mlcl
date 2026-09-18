import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const createPickListSchema = z.object({
  order_id: z.string().nullable().optional(),
  status: z.enum(['open', 'in_progress', 'completed']).default('open'),
  assigned_user_id: z.string().nullable().optional(),
  lines: z
    .array(
      z.object({
        product_variant_id: z.string().nullable().optional(),
        location_id: z.string().nullable().optional(),
        quantity_to_pick: z.number().int().positive().default(1),
      }),
    )
    .optional(),
})

const recordPickSchema = z.object({
  quantity_picked: z.number().int().nonnegative(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const status = typeof req.query.status === 'string' ? req.query.status : null
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const lists = await findMany('pick_lists', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(lists)
  } catch (error) {
    logger.error('picks.handler', error)
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
    const list = await findById<Record<string, unknown>>('pick_lists', id)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('picks.notFound', {}, { defaultValue: 'Pick list not found' }) })
    }
    if (list.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const lines = await findMany('pick_lines', {
      where: [{ field: 'pick_list_id', operator: '=', value: id }],
    })
    res.json({ ...list, lines })
  } catch (error) {
    logger.error('picks.handler', error)
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

    const parsed = createPickListSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const data = parsed.data
    const result = await create<Record<string, unknown>>('pick_lists', {
      user_id: userId,
      order_id: data.order_id ?? null,
      status: data.status,
      assigned_user_id: data.assigned_user_id ?? null,
      created_at: new Date(),
    })

    const list = result.data
    if (list && data.lines && data.lines.length > 0) {
      for (const line of data.lines) {
        await create('pick_lines', {
          user_id: userId,
          pick_list_id: list.id as string,
          product_variant_id: line.product_variant_id ?? null,
          location_id: line.location_id ?? null,
          quantity_to_pick: line.quantity_to_pick,
          quantity_picked: 0,
          created_at: new Date(),
        })
      }
    }

    res.status(201).json(list)
  } catch (error) {
    logger.error('picks.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/lines/:lineId/pick', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const lineId = getParamId(req, 'lineId')
    const list = await findById<Record<string, unknown>>('pick_lists', id)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('picks.notFound', {}, { defaultValue: 'Pick list not found' }) })
    }
    if (list.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const parsed = recordPickSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    // Verify the targeted child line actually belongs to BOTH this list and the
    // caller before mutating — the parent-list ownership check above does not
    // constrain `lineId`, which arrives straight from the URL. Mirrors
    // receipts.ts /items/:id/receive. 404 (not 403) avoids existence disclosure
    // since the line id is otherwise unguessable.
    const line = await findById<Record<string, unknown>>('pick_lines', lineId)
    if (!line || line.pick_list_id !== id || line.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('picks.lineNotFound', {}, { defaultValue: 'Pick line not found' }) })
    }

    const result = await updateById('pick_lines', lineId, {
      quantity_picked: parsed.data.quantity_picked,
      picked_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('picks.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const id = getParamId(req)
    const list = await findById<Record<string, unknown>>('pick_lists', id)
    if (!list) {
      return res
        .status(404)
        .json({ error: t('picks.notFound', {}, { defaultValue: 'Pick list not found' }) })
    }
    if (list.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }

    const result = await updateById('pick_lists', id, {
      status: 'completed',
      completed_at: new Date(),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('picks.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
