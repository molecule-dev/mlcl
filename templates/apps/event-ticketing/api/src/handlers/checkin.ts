import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const orderIdParamSchema = z.object({ order_id: z.string().min(1) })
const ticketIdParamSchema = z.object({ ticket_id: z.string().min(1) })
const eventIdParamSchema = z.object({ event_id: z.string().min(1) })
const ticketCheckinBodySchema = z.object({
  qr_payload: z.string().min(1).optional(),
  event_id: z.string().min(1),
})

/**
 * Order-level check-in (legacy compatibility). Marks the entire order as
 * checked-in. Authorization: caller must be the event's organizer.
 */
router.post(
  '/:order_id',
  validateParams(orderIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const orderId = getParamId(req, 'order_id')
      const order = await findById<Record<string, unknown>>('orders', orderId)
      if (!order) {
        return res
          .status(404)
          .json({ error: t('order.notFound', {}, { defaultValue: 'Order not found' }) })
      }
      const event = await findById<Record<string, unknown>>('events', String(order.event_id))
      if (!event || (event.organizer_user_id !== userId && event.user_id !== userId)) {
        return res
          .status(403)
          .json({ error: t('checkin.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      if (order.status === 'refunded' || order.status === 'cancelled') {
        return res.status(409).json({
          error: t('checkin.invalidOrderState', {}, { defaultValue: 'Order is not active' }),
        })
      }
      if (event.status === 'cancelled') {
        return res
          .status(409)
          .json({ error: t('checkin.eventCancelled', {}, { defaultValue: 'Event is cancelled' }) })
      }
      if (order.checked_in) {
        return res.status(409).json({
          error: t('checkin.alreadyCheckedIn', {}, { defaultValue: 'Already checked in' }),
        })
      }
      const result = await updateById('orders', orderId, {
        checked_in: true,
        checked_in_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('checkin order POST failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

/**
 * Per-ticket check-in. Used by the scanner page: scan QR → POST here with
 * the qr_payload + event_id. Validates the ticket belongs to the event and
 * that the caller is the organizer; flips the ticket status to checked_in.
 */
router.post(
  '/ticket/:ticket_id',
  validateParams(ticketIdParamSchema),
  validateBody(ticketCheckinBodySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const ticketId = getParamId(req, 'ticket_id')
      const ticket = await findById<Record<string, unknown>>('tickets', ticketId)
      if (!ticket) {
        return res
          .status(404)
          .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket not found' }) })
      }
      // When the scanner submits the QR contents, verify they match the ticket's stored payload:
      // a forged/mismatched QR carrying a valid ticket_id must NOT check in (the handler doc
      // promises this validation). Manual check-in with no qr_payload stays allowed (the caller
      // is already the authenticated event organizer).
      const scannedQr = (req.body as { qr_payload?: string }).qr_payload
      if (scannedQr && String(ticket.qr_payload ?? '') !== scannedQr) {
        return res.status(409).json({
          error: t(
            'checkin.qrMismatch',
            {},
            { defaultValue: 'QR code does not match this ticket' },
          ),
        })
      }
      if (ticket.event_id !== req.body.event_id) {
        return res.status(409).json({
          error: t(
            'checkin.eventMismatch',
            {},
            { defaultValue: 'Ticket does not belong to this event' },
          ),
        })
      }
      const event = await findById<Record<string, unknown>>('events', String(ticket.event_id))
      if (!event || (event.organizer_user_id !== userId && event.user_id !== userId)) {
        return res
          .status(403)
          .json({ error: t('checkin.forbidden', {}, { defaultValue: 'Forbidden' }) })
      }
      if (ticket.status === 'refunded') {
        return res.status(409).json({
          error: t('checkin.refundedTicket', {}, { defaultValue: 'Ticket has been refunded' }),
        })
      }
      if (ticket.status === 'checked_in') {
        return res.status(409).json({
          error: t('checkin.alreadyCheckedIn', {}, { defaultValue: 'Already checked in' }),
        })
      }
      if (event.status === 'cancelled') {
        return res
          .status(409)
          .json({ error: t('checkin.eventCancelled', {}, { defaultValue: 'Event is cancelled' }) })
      }
      const result = await updateById('tickets', ticketId, {
        status: 'checked_in',
        updated_at: new Date(),
      })
      res.json(result.data)
    } catch (err) {
      logger.error('checkin ticket POST failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get(
  '/stats/:event_id',
  validateParams(eventIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const eventId = getParamId(req, 'event_id')
      const event = await findById<Record<string, unknown>>('events', eventId)
      if (!event || (event.organizer_user_id !== userId && event.user_id !== userId)) {
        return res
          .status(404)
          .json({ error: t('event.notFound', {}, { defaultValue: 'Event not found' }) })
      }
      const tickets = await findMany<Record<string, unknown>>('tickets', {
        where: [{ field: 'event_id', operator: '=', value: eventId }],
      })
      const checked = tickets.filter((t) => t.status === 'checked_in').length
      const issued = tickets.filter(
        (t) => t.status === 'issued' || t.status === 'checked_in',
      ).length
      res.json({
        total_attendees: issued,
        checked_in: checked,
        not_checked_in: issued - checked,
      })
    } catch (err) {
      logger.error('checkin stats GET failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
