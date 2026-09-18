import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { userCanEditTrip } from './_authz.js'

const router = Router()

const createBookingSchema = z.object({
  trip_id: z.string().min(1),
  kind: z.enum(['flight', 'hotel', 'car', 'other']),
  title: z.string().min(1),
  detail: z.string().optional(),
  start_at: z.string().optional(),
  end_at: z.string().optional(),
  confirmation_code: z.string().optional(),
  status: z.string().optional(),
  cost_cents: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  vendor: z.string().optional(),
})

// [L2-1] Omit the parent FK from updates: `.partial()` would let an update body reassign
// `trip_id` to another user's trip (only the create path checks ownership), attaching this
// booking to a victim's trip. Reparenting is not supported here, so drop it entirely.
const updateBookingSchema = createBookingSchema.omit({ trip_id: true }).partial()

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (req.query.trip_id) {
      where.push({ field: 'trip_id', operator: '=', value: String(req.query.trip_id) })
    }
    const bookings = await findMany('trip_bookings', {
      where,
      orderBy: [{ field: 'start_at', direction: 'asc' }],
    })
    res.json(bookings)
  } catch (error) {
    logger.error('bookings.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const booking = await findById<Record<string, unknown>>('trip_bookings', id)
    if (!booking || booking.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', undefined, { defaultValue: 'Booking not found.' }) })
    }
    res.json(booking)
  } catch (error) {
    logger.error('bookings.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/', validateBody(createBookingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const data = req.body as z.infer<typeof createBookingSchema>
    if (!(await userCanEditTrip(data.trip_id, userId))) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    const result = await create('trip_bookings', {
      user_id: userId,
      trip_id: data.trip_id,
      kind: data.kind,
      title: data.title,
      detail: data.detail ?? null,
      start_at: data.start_at ?? null,
      end_at: data.end_at ?? null,
      confirmation_code: data.confirmation_code ?? null,
      status: data.status ?? 'confirmed',
      cost_cents: data.cost_cents ?? 0,
      currency: data.currency ?? 'USD',
      vendor: data.vendor ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('bookings.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.put('/:id', validateBody(updateBookingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trip_bookings', id)
    if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', undefined, { defaultValue: 'Booking not found.' }) })
    }
    const result = await updateById('trip_bookings', id, { ...req.body, updated_at: new Date() })
    res.json(result.data)
  } catch (error) {
    logger.error('bookings.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trip_bookings', id)
    if (!existing || !(await userCanEditTrip(String(existing.trip_id), userId))) {
      return res
        .status(404)
        .json({ error: t('booking.notFound', undefined, { defaultValue: 'Booking not found.' }) })
    }
    await deleteById('trip_bookings', id)
    res.status(204).end()
  } catch (error) {
    logger.error('bookings.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
