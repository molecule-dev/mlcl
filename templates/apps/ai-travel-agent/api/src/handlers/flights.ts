/**
 * Flight handlers — the search the UI runs beside the agent, and the delay
 * control that drives the automatic rebooking flow in demos and e2e.
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { checkDelays, simulateDelay } from '../lib/delay-watch.js'
import { findFlights, normalizeCabin } from '../lib/flights.js'

const router = Router()

const searchSchema = z.object({
  origin: z.string().regex(/^[A-Za-z]{3}$/),
  destination: z.string().regex(/^[A-Za-z]{3}$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.string().regex(/^\d+$/).optional(),
  cabin: z.string().max(20).optional(),
})

const delaySchema = z.object({
  minutes: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
})

router.get('/search', validateQuery(searchSchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const q = req.query as z.infer<typeof searchSchema>
    const flights = await findFlights({
      origin: q.origin,
      destination: q.destination,
      departureDate: q.date,
      adults: Number(q.adults ?? 1),
      cabin: normalizeCabin(q.cabin),
    })
    res.json(flights)
  } catch (error) {
    logger.error('flights.search', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

/**
 * Mark an inventory flight delayed by `minutes` (0 puts it back on time), then
 * run the delay watcher for the caller so a qualifying delay rebooks at once.
 */
router.post('/:id/delay', validateBody(delaySchema), async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const flight = await simulateDelay(String(req.params.id), req.body.minutes)
    if (!flight) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const outcome = await checkDelays(userId)
    res.json({ flight, ...outcome })
  } catch (error) {
    logger.error('flights.delay', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
