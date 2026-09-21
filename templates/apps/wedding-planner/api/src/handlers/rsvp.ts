/**
 * PUBLIC RSVP collection — the code-in / name-match / confirm flow that
 * backs /rsvp/:code. No authentication: the couple shares the code, the
 * guest finds themselves by name.
 *
 * GET  /api/public/rsvp/:code           wedding public info + meal options
 * POST /api/public/rsvp/:code/lookup    { name }  → the matching guest
 *                                       (id, plus_ones allowance, current RSVP)
 * POST /api/public/rsvp/:code/respond   { guest_id, rsvp_status, meal_choice?,
 *                                        plus_ones? } → records the response
 *
 * Deliberately minimal data exposure: lookup returns ONE guest (exact,
 * case-insensitive name match), never the list. A wrong name is a 404 with
 * no oracle — the response does not reveal which names exist.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import { normalizeGuestName, toDateString } from '../lib/wedding.js'

const router = Router()

const codeParamSchema = z.object({ code: z.string().min(1).max(24) })

const lookupSchema = z.object({
  name: z.string().min(1).max(200),
})

const respondSchema = z.object({
  guest_id: z.string().uuid(),
  rsvp_status: z.enum(['yes', 'no', 'maybe']),
  meal_choice: z.string().max(120).optional().nullable(),
  plus_ones: z.number().int().min(0).max(10).optional(),
})

async function weddingByCode(code: string): Promise<Record<string, unknown> | null> {
  return findOne('weddings', [{ field: 'rsvp_code', operator: '=', value: code }])
}

router.get('/:code', validateParams(codeParamSchema), async (req: Request, res: Response) => {
  try {
    const code = String(req.params.code ?? '')
    const wedding = await weddingByCode(code)
    if (!wedding) {
      return res
        .status(404)
        .json({ error: t('rsvp.notFound', {}, { defaultValue: 'RSVP code not found' }) })
    }
    const meals = await findMany<{ name: string; description: string | null }>('rsvp_meals', {
      where: [{ field: 'wedding_id', operator: '=', value: String(wedding.id) }],
      orderBy: [{ field: 'position', direction: 'asc' }],
      limit: 20,
    })
    // Normalize the DATE column to a calendar string (see lib/wedding.ts) —
    // a raw toISOString shifts the day for east-of-UTC machines.
    const date = toDateString(wedding.wedding_date) ?? ''
    res.json({
      partner_a_name: wedding.partner_a_name,
      partner_b_name: wedding.partner_b_name,
      wedding_date: date,
      venue: wedding.venue,
      plus_ones_allowed: Boolean(wedding.plus_ones_allowed),
      meals,
    })
  } catch (err) {
    logger.error('public rsvp GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/:code/lookup',
  validateParams(codeParamSchema),
  validateBody(lookupSchema),
  async (req: Request, res: Response) => {
    try {
      const code = String(req.params.code ?? '')
      const wedding = await weddingByCode(code)
      if (!wedding) {
        return res
          .status(404)
          .json({ error: t('rsvp.notFound', {}, { defaultValue: 'RSVP code not found' }) })
      }
      const guests = await findMany<{
        id: string
        name: string
        rsvp_status: string
        meal_choice: string | null
        plus_ones: number
      }>('guests', {
        where: [{ field: 'wedding_id', operator: '=', value: String(wedding.id) }],
        limit: 1000,
      })
      const wanted = normalizeGuestName(String(req.body.name))
      const guest = guests.find((g) => normalizeGuestName(g.name) === wanted)
      if (!guest) {
        return res.status(404).json({
          error: t(
            'rsvp.nameNotFound',
            {},
            {
              defaultValue:
                'We could not find that name on the guest list. Check the spelling or contact the couple.',
            },
          ),
        })
      }
      res.json({
        guest_id: guest.id,
        name: guest.name,
        rsvp_status: guest.rsvp_status,
        meal_choice: guest.meal_choice,
        plus_ones: guest.plus_ones,
        plus_ones_allowed: Boolean(wedding.plus_ones_allowed),
      })
    } catch (err) {
      logger.error('public rsvp lookup failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.post(
  '/:code/respond',
  validateParams(codeParamSchema),
  validateBody(respondSchema),
  async (req: Request, res: Response) => {
    try {
      const code = String(req.params.code ?? '')
      const wedding = await weddingByCode(code)
      if (!wedding) {
        return res
          .status(404)
          .json({ error: t('rsvp.notFound', {}, { defaultValue: 'RSVP code not found' }) })
      }
      // The guest must belong to THIS wedding — a guest_id from another
      // wedding's list must not be writable through this endpoint.
      const guest = await findOne('guests', [
        { field: 'id', operator: '=', value: req.body.guest_id },
        { field: 'wedding_id', operator: '=', value: String(wedding.id) },
      ])
      if (!guest) {
        return res
          .status(404)
          .json({ error: t('rsvp.guestNotFound', {}, { defaultValue: 'Guest not found' }) })
      }
      const writes: Record<string, unknown> = {
        rsvp_status: req.body.rsvp_status,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      if (req.body.meal_choice !== undefined) {
        writes.meal_choice = req.body.meal_choice
      }
      if (req.body.plus_ones !== undefined) {
        // Cap at the couple's policy, silently — the form already hides the
        // control when plus-ones are not allowed.
        writes.plus_ones = wedding.plus_ones_allowed ? req.body.plus_ones : 0
      }
      if (req.body.rsvp_status === 'no') {
        // A decline clears the meal + plus-ones.
        writes.meal_choice = null
        writes.plus_ones = 0
      }
      const result = await updateById('guests', req.body.guest_id, writes)
      res.json({
        guest_id: (result.data as { id: string }).id,
        rsvp_status: req.body.rsvp_status,
      })
    } catch (err) {
      logger.error('public rsvp respond failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
