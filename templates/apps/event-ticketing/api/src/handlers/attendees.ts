/**
 * Per-event attendee directory for the organizer Attendees page.
 *
 * GET /:event_id — returns a list of attendee rows with the buyer's name +
 * email, the tier they bought, the ref code, status, and purchase time.
 * Authorization: caller must own the event.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const eventIdParamSchema = z.object({ event_id: z.string().min(1) })

router.get(
  '/:event_id',
  validateParams(eventIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const eventId = String(req.params.event_id)
      const event = await findById<Record<string, unknown>>('events', eventId)
      if (!event || (event.organizer_user_id !== userId && event.user_id !== userId)) {
        return res
          .status(404)
          .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
      }

      const tickets = await findMany<Record<string, unknown>>('tickets', {
        where: [{ field: 'event_id', operator: '=', value: eventId }],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })

      // Resolve buyer + tier display fields. Cache by id to avoid repeat queries.
      const userCache = new Map<string, Record<string, unknown> | null>()
      const tierCache = new Map<string, Record<string, unknown> | null>()
      const out: Array<Record<string, unknown>> = []
      for (const tk of tickets) {
        const tkUserId = String(tk.user_id ?? '')
        let user = userCache.get(tkUserId) ?? null
        if (!userCache.has(tkUserId)) {
          user = tkUserId ? await findById<Record<string, unknown>>('users', tkUserId) : null
          userCache.set(tkUserId, user)
        }
        const tkTierId = String(tk.tier_id ?? '')
        let tier = tierCache.get(tkTierId) ?? null
        if (tkTierId && !tierCache.has(tkTierId)) {
          tier = await findById<Record<string, unknown>>('ticket_tiers', tkTierId)
          tierCache.set(tkTierId, tier)
        }
        out.push({
          id: tk.id,
          ticket_id: tk.id,
          order_id: tk.order_id,
          ref_code: tk.ref_code,
          tier_id: tk.tier_id,
          tier_name: tier?.name ?? null,
          status: tk.status,
          name: user?.name ?? null,
          email: user?.email ?? null,
          purchased_at: tk.created_at,
          checked_in_at: tk.updated_at,
        })
      }
      res.json(out)
    } catch (err) {
      logger.error('attendees GET failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
