import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

// Packing is a transient step that consumes a completed pick_list and
// produces a shipment. We model it as a small action surface against
// pick_lists rather than introducing a separate packing_tasks table —
// the shipment row IS the packed-and-ready signal.
const startPackingSchema = z.object({
  pick_list_id: z.string().min(1),
})

const recordBoxSchema = z.object({
  pick_list_id: z.string().min(1),
  total_weight_oz: z.number().nonnegative().default(0),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    // "Packing queue" = completed pick lists with no shipment yet.
    const completed = await findMany<Record<string, unknown>>('pick_lists', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'completed' },
      ],
      orderBy: [{ field: 'completed_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(completed)
  } catch (error) {
    logger.error('packing.handler', error)
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
        .json({ error: t('packing.notFound', {}, { defaultValue: 'Packing task not found' }) })
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
    logger.error('packing.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/start', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = startPackingSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const list = await findById<Record<string, unknown>>('pick_lists', parsed.data.pick_list_id)
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
    if (list.status !== 'completed') {
      return res.status(400).json({
        error: t(
          'packing.pickNotComplete',
          {},
          {
            defaultValue: 'Pick list must be completed before packing',
          },
        ),
      })
    }

    res.status(200).json({ ok: true, pick_list_id: list.id })
  } catch (error) {
    logger.error('packing.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/box', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const parsed = recordBoxSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const list = await findById<Record<string, unknown>>('pick_lists', parsed.data.pick_list_id)
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

    // v1 mock shipping bond: generate a fake tracking number, no real
    // carrier API call. See INVENTORY "Shipping integration depth" notes.
    const trackingNumber = `MOCK-${Date.now().toString(36).toUpperCase()}`

    const shipmentResult = await create<Record<string, unknown>>('shipments', {
      user_id: userId,
      order_id: list.order_id ?? null,
      carrier: 'mock',
      tracking_number: trackingNumber,
      weight_oz: parsed.data.total_weight_oz,
      status: 'label_created',
      created_at: new Date(),
    })

    res.status(201).json(shipmentResult.data)
  } catch (error) {
    logger.error('packing.handler', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
