import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  kind: z.enum(['saved', 'booked']).optional(),
  status: z.string().optional(),
})

const createTripSchema = z.object({
  kind: z.enum(['saved', 'booked']).optional(),
  flight_payload: z.record(z.string(), z.unknown()).optional(),
  passenger_count: z.number().int().min(1).optional(),
  cabin: z.enum(['economy', 'premium_economy', 'business', 'first']).optional(),
  total_cents: z.number().int().min(0).optional(),
  currency: z.string().optional(),
  confirmation_code: z.string().optional(),
})

const updateTripSchema = createTripSchema.partial().extend({
  status: z.enum(['draft', 'pending_payment', 'booked', 'cancelled']).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const { kind, status } = req.query as Record<string, string | undefined>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (kind) where.push({ field: 'kind', operator: '=', value: kind })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const trips = await findMany('trips', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(trips)
  } catch (err) {
    console.error('[trips] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const trip = await findById<Record<string, unknown>>('trips', id)
    if (!trip || trip.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', {}, { defaultValue: 'Trip not found' }) })
    }
    res.json(trip)
  } catch (err) {
    console.error('[trips] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createTripSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const result = await create<Record<string, unknown>>('trips', {
      ...req.body,
      user_id: userId,
      kind: req.body.kind ?? 'saved',
      status: req.body.kind === 'booked' ? 'pending_payment' : 'draft',
      flight_payload: req.body.flight_payload ?? {},
      passenger_count: req.body.passenger_count ?? 1,
      cabin: req.body.cabin ?? 'economy',
      total_cents: req.body.total_cents ?? 0,
      currency: req.body.currency ?? 'USD',
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[trips] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateTripSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const existing = await findById<Record<string, unknown>>('trips', id)
      if (!existing || existing.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('trip.notFound', {}, { defaultValue: 'Trip not found' }) })
      }
      const result = await updateById('trips', id, {
        ...req.body,
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      console.error('[trips] failed:', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id/cancel', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trips', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', {}, { defaultValue: 'Trip not found' }) })
    }
    const result = await updateById('trips', id, {
      status: 'cancelled',
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[trips] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark trip as checked in. Persists `checked_in_at` inside the trip's
// flight_payload JSON column so we don't need a schema migration. The
// frontend renders a "Checked in" badge once this is set.
router.post('/:id/check-in', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trips', id)
    if (!existing || existing.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', {}, { defaultValue: 'Trip not found' }) })
    }
    if (existing.status !== 'booked') {
      return res.status(409).json({
        error: t('trip.notBooked', {}, { defaultValue: 'Only booked trips can be checked in.' }),
      })
    }
    const currentPayload = (existing.flight_payload as Record<string, unknown> | null) ?? {}
    const flight_payload = { ...currentPayload, checked_in_at: new Date().toISOString() }
    const result = await updateById('trips', id, {
      flight_payload,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    console.error('[trips] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trips', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', {}, { defaultValue: 'Trip not found' }) })
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: t('trip.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('trips', id)
    res.status(204).end()
  } catch (err) {
    console.error('[trips] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
