import { type RequestHandler, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

const reservationStatuses = ['confirmed', 'seated', 'waitlist', 'cancelled', 'no_show'] as const

const createReservationSchema = z.object({
  party_size: z.number().int().positive().max(50),
  scheduled_for: z.string().min(1),
  notes: z.string().max(500).nullable().optional(),
  table_id: z.string().nullable().optional(),
  customer_id: z.string().nullable().optional(),
  party_name: z.string().min(1).max(200),
  status: z.enum(reservationStatuses).optional(),
})

const updateReservationSchema = createReservationSchema.partial().extend({
  status: z.enum(reservationStatuses).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(reservationStatuses),
})

router.get('/', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.status && req.query.status !== 'all') {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100))
  const reservations = await findMany<Record<string, unknown>>('reservations', {
    where,
    limit,
    offset: (page - 1) * limit,
    orderBy: [{ field: 'scheduled_for', direction: 'asc' }],
  })
  const total = await count('reservations', where)
  res.json({ data: reservations, total, page, limit })
})

router.get('/:id', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const reservation = await findById<Record<string, unknown>>('reservations', id)
  if (!reservation || reservation.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('reservations.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  res.json(reservation)
})

router.post('/', validateBody(createReservationSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof createReservationSchema>
  const result = await create<Record<string, unknown>>('reservations', {
    user_id: userId,
    customer_id: body.customer_id ?? null,
    table_id: body.table_id ?? null,
    party_size: body.party_size,
    scheduled_for: new Date(body.scheduled_for).toISOString(),
    status: body.status ?? 'confirmed',
    notes: body.party_name
      ? `${body.party_name}${body.notes ? ` — ${body.notes}` : ''}`
      : (body.notes ?? null),
  })
  broadcast('reservations', 'reservation_created', { id: result.data?.id })
  res.status(201).json(result.data)
})

router.put('/:id/status', validateBody(updateStatusSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<Record<string, unknown>>('reservations', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('reservations.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  const { status } = req.body as z.infer<typeof updateStatusSchema>
  const result = await updateById<Record<string, unknown>>('reservations', id, { status })
  if (status === 'seated' && existing.table_id) {
    await updateById('tables', existing.table_id as string, { status: 'reserved' }).catch(
      (error) => {
        logger.warn('reservations.markTableReserved', error)
      },
    )
  }
  broadcast('reservations', 'reservation_status', { id, status })
  res.json(result.data)
})

router.put('/:id', validateBody(updateReservationSchema) as RequestHandler, async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<Record<string, unknown>>('reservations', id)
  if (!existing || existing.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('reservations.notFound', {}, { defaultValue: 'Reservation not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateReservationSchema>
  const updates: Record<string, unknown> = {}
  if (body.party_size !== undefined) updates.party_size = body.party_size
  if (body.scheduled_for !== undefined)
    updates.scheduled_for = new Date(body.scheduled_for).toISOString()
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.table_id !== undefined) updates.table_id = body.table_id
  if (body.customer_id !== undefined) updates.customer_id = body.customer_id
  if (body.status !== undefined) updates.status = body.status
  const result = await updateById<Record<string, unknown>>('reservations', id, updates)
  // Keep the live reservations board in sync — an edit (new time/party size/table) must reach it
  // like create + status changes do, or the board shows stale details.
  broadcast('reservations', 'reservation_updated', { id })
  res.json(result.data)
})

router.delete('/:id', async (req, res) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = req.params.id as string
  const existing = await findById<Record<string, unknown>>('reservations', id)
  if (!existing) {
    res.status(204).end()
    return
  }
  if (existing.user_id !== userId) {
    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
    return
  }
  await deleteById('reservations', id)
  // Remove the cancelled reservation from the live board too — otherwise it lingers as a ghost.
  broadcast('reservations', 'reservation_deleted', { id })
  res.status(204).end()
})

export default router
