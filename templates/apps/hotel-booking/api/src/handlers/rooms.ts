import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const availabilityQuerySchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
})

function getUserId(res: Response): string | null {
  // Public read endpoints don't require auth, but capturing userId here lets
  // future hold/wishlist behaviour scope by user_id without changing shape.
  const session = res.locals.session as { userId?: string } | undefined
  return session?.userId ?? null
}

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const room = await findById('rooms', getParamId(req))
    if (!room) {
      res.status(404).json({ error: t('room.notFound', {}, { defaultValue: 'Room not found' }) })
      return
    }
    res.json(room)
  } catch (error) {
    logger.error('rooms.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get(
  '/:id/availability',
  validateParams(idParamSchema),
  validateQuery(availabilityQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { start_date, end_date } = req.query as unknown as z.infer<
        typeof availabilityQuerySchema
      >
      // Fetch confirmed reservations overlapping the window. Anonymous read is
      // permitted for availability; the userId from the session is captured but
      // not enforced here — ownership-scoped queries live on /reservations.
      void getUserId(res)
      const roomId = getParamId(req)
      const where: WhereCondition[] = [
        { field: 'room_id', operator: '=', value: roomId },
        { field: 'status', operator: '=', value: 'confirmed' },
        { field: 'check_out', operator: '>=', value: String(start_date) },
        { field: 'check_in', operator: '<=', value: String(end_date) },
      ]
      const reservations = await findMany('reservations', { where })
      const booked = reservations as unknown[]
      // A room row is a room *type* with `total_rooms` physical units, so it stays available
      // until every unit is booked for the window — not after the first reservation.
      const room = await findById<Record<string, unknown>>('rooms', roomId)
      const totalUnits = Math.max(1, Number(room?.total_rooms ?? 1))
      res.json({ available: booked.length < totalUnits, blocked_dates: reservations })
    } catch (error) {
      logger.error('rooms.availability', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
