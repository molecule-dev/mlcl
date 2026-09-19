/**
 * `/api/reservations` — the front-desk write path for stays.
 *
 * Creation, listing and lifecycle transitions. The heavy lifting (pricing,
 * occupancy ceiling, overbooking guard, confirmation-code minting) lives in
 * `lib/pms.ts` so the voice agent books through the EXACT same rules.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import {
  createReservationInternal,
  PmsError,
  type ReservationRow,
  STATUS_TRANSITIONS,
  transitionReservation,
} from '../lib/pms.js'

const router = Router()

export const RESERVATION_STATUSES = [
  'held',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
  'no_show',
] as const

const listQuerySchema = z.object({
  status: z.enum(RESERVATION_STATUSES).optional(),
  source: z.enum(['phone', 'front_desk', 'online']).optional(),
  guest_id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

const createSchema = z.object({
  room_type_id: z.string().uuid(),
  guest_id: z.string().uuid().optional(),
  guest_name: z.string().min(1).max(160),
  guest_contact: z.string().max(160).optional(),
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(12).default(1),
  notes: z.string().max(4000).optional(),
})

const statusSchema = z.object({
  status: z.enum(RESERVATION_STATUSES),
})

const patchSchema = z.object({
  guest_name: z.string().min(1).max(160).optional(),
  guest_contact: z.string().max(160).nullable().optional(),
  guests: z.coerce.number().int().min(1).max(12).optional(),
  notes: z.string().max(4000).nullable().optional(),
  room_id: z.string().uuid().nullable().optional(),
})

function requireUserId(res: Response): string | null {
  return getUserId(res)
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    if (!requireUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { status, source, guest_id, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: WhereCondition[] = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (source) where.push({ field: 'source', operator: '=', value: source })
    if (guest_id) where.push({ field: 'guest_id', operator: '=', value: guest_id })
    const rows = await findMany<ReservationRow>('reservations', {
      ...(where.length > 0 ? { where } : {}),
      orderBy: [{ field: 'check_in', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json({ data: rows })
  } catch (error) {
    logger.error('reservations.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!requireUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const row = await findOne<ReservationRow>('reservations', [
      { field: 'id', operator: '=', value: getParamId(req) },
    ])
    if (!row) {
      res
        .status(404)
        .json({ error: t('reservations.notFound', {}, { defaultValue: 'Reservation not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('reservations.detail', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createSchema>
    const reservation = await createReservationInternal({
      room_type_id: body.room_type_id,
      guest_id: body.guest_id ?? null,
      guest_name: body.guest_name,
      guest_contact: body.guest_contact ?? null,
      check_in: body.check_in,
      check_out: body.check_out,
      guests: body.guests,
      source: 'front_desk',
      notes: body.notes ?? null,
      created_by: userId,
    })
    res.status(201).json(reservation)
  } catch (error) {
    if (error instanceof PmsError) {
      res.status(error.status).json({ error: error.message, code: error.code })
      return
    }
    logger.error('reservations.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(patchSchema),
  async (req: Request, res: Response) => {
    try {
      if (!requireUserId(res)) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const existing = await findOne<ReservationRow>('reservations', [
        { field: 'id', operator: '=', value: getParamId(req) },
      ])
      if (!existing) {
        res.status(404).json({
          error: t('reservations.notFound', {}, { defaultValue: 'Reservation not found' }),
        })
        return
      }
      const body = req.body as z.infer<typeof patchSchema>
      const patch: Record<string, unknown> = {}
      if (body.guest_name !== undefined) patch.guest_name = body.guest_name
      if (body.guest_contact !== undefined) patch.guest_contact = body.guest_contact
      if (body.guests !== undefined) patch.guests = body.guests
      if (body.notes !== undefined) patch.notes = body.notes
      if (body.room_id !== undefined) patch.room_id = body.room_id
      const result = await updateById<ReservationRow>('reservations', getParamId(req), patch)
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('reservations.patch', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

/**
 * Lifecycle transition (confirm → check in → check out, cancel, no-show).
 * Guards + timestamps + guest stay_count maintenance live in
 * `transitionReservation`; the allowed moves are echoed in the error body
 * so the UI can render which buttons are legal.
 */
router.put(
  '/:id/status',
  validateParams(idParamSchema),
  validateBody(statusSchema),
  async (req: Request, res: Response) => {
    try {
      if (!requireUserId(res)) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { status } = req.body as z.infer<typeof statusSchema>
      const reservation = await transitionReservation(getParamId(req), status)
      res.json(reservation)
    } catch (error) {
      if (error instanceof PmsError) {
        res
          .status(error.status)
          .json({ error: error.message, code: error.code, transitions: STATUS_TRANSITIONS })
        return
      }
      logger.error('reservations.status', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
