/**
 * `/api/availability` — the dates × occupancy search that powers both the
 * front-desk New Reservation flow and (through the shared lib) the voice
 * agent's `search_availability` tool. Read-only.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

import { PmsError, searchAvailability } from '../lib/pms.js'

const router = Router()

const querySchema = z.object({
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guests: z.coerce.number().int().min(1).max(12).optional(),
})

router.get('/', validateQuery(querySchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { check_in, check_out, guests } = req.query as unknown as z.infer<typeof querySchema>
    const options = await searchAvailability({ check_in, check_out, guests })
    res.json({
      check_in,
      check_out,
      guests: guests ?? 1,
      options: options.map((o) => ({
        room_type_id: o.room_type.id,
        name: o.room_type.name,
        description: o.room_type.description,
        occupancy: o.room_type.occupancy,
        amenities: o.room_type.amenities,
        rooms_total: o.rooms_total,
        rooms_available: o.rooms_available,
        nightly_rates: o.nightly_rates,
        avg_rate_cents: o.avg_rate_cents,
        total_cents: o.total_cents,
      })),
    })
  } catch (error) {
    if (error instanceof PmsError) {
      res.status(error.status).json({ error: error.message, code: error.code })
      return
    }
    logger.error('availability.search', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
