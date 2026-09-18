/**
 * `/api/trips` — view-shaped, owner-scoped projection of `reservations`.
 *
 * The frontend (Trips.tsx, TripDetail.tsx) was authored against a
 * trip view-shape (property_name, check_in_iso, status, total_cents,
 * cancellable, modifiable, …). This handler decorates raw reservation
 * rows into that shape and only returns rows owned by the session
 * user. Per-trip cancellation is a thin wrapper around
 * PUT /api/reservations/:id/cancel that returns the same view shape.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

import { decorateTrip, decorateTrips } from './_decorate.js'

const router = Router()

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const reservations = await findMany<Record<string, unknown>>('reservations', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'check_in', direction: 'desc' }],
    limit: 100,
  })
  res.json({ data: await decorateTrips(reservations) })
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const reservation = await findById<Record<string, unknown>>('reservations', getParamId(req))
  if (!reservation) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Trip not found' }) })
    return
  }
  if (reservation.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  res.json(await decorateTrip(reservation))
})

router.put('/:id/cancel', validateParams(idParamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const reservation = await findById<Record<string, unknown>>('reservations', getParamId(req))
  if (!reservation) {
    res
      .status(404)
      .json({ error: t('reservation.notFound', {}, { defaultValue: 'Trip not found' }) })
    return
  }
  if (reservation.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  const result = await updateById<Record<string, unknown>>('reservations', getParamId(req), {
    status: 'cancelled',
    cancelled_at: new Date(),
  })
  const row = (result.data ?? result) as Record<string, unknown>
  res.json(await decorateTrip(row))
})

export default router
