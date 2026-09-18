import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listSchema = z.object({
  status: z.string().optional(),
  event_id: z.string().optional(),
})

/**
 * GET / — list tickets owned by the authenticated user (used by MyTickets).
 */
router.get('/', validateQuery(listSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const { status, event_id } = req.query as Record<string, string | undefined>
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (event_id) where.push({ field: 'event_id', operator: '=', value: event_id })
    const tickets = await findMany('tickets', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(tickets)
  } catch (err) {
    logger.error('my-tickets GET failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const ticket = await findById<Record<string, unknown>>('tickets', id)
    if (!ticket) {
      return res
        .status(404)
        .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket not found' }) })
    }
    // Visible to the current holder OR the event's organizer.
    let canRead = ticket.user_id === userId
    if (!canRead && ticket.event_id) {
      const event = await findById<Record<string, unknown>>('events', String(ticket.event_id))
      canRead = !!event && (event.organizer_user_id === userId || event.user_id === userId)
    }
    if (!canRead) {
      return res
        .status(404)
        .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket not found' }) })
    }
    res.json(ticket)
  } catch (err) {
    logger.error('my-tickets GET :id failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * GET /:id/wallet-pass — generate an Apple Wallet `.pkpass` or Google Wallet
 * pass-jwt for a ticket.
 *
 * BLOCKED: WALLET_PASS_BOND_NOT_BUILT — `@molecule/api-wallet-pass` is
 * proposed but not yet built. INVENTORY explicitly marks wallet pass as
 * "Optional v1; can stub". Returns a stubbed pass-token (the qr_payload)
 * with content-type application/json and a 200; the frontend treats this
 * as a fallback "save QR as image" experience.
 */
router.get(
  '/:id/wallet-pass',
  validateParams(idParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const id = getParamId(req)
      const ticket = await findById<Record<string, unknown>>('tickets', id)
      if (!ticket || ticket.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket not found' }) })
      }
      res.json({
        format: 'stub',
        ref_code: ticket.ref_code,
        qr_payload: ticket.qr_payload,
        // BLOCKED: WALLET_PASS_BOND_NOT_BUILT — see INVENTORY user-flow notes.
        notice: t(
          'walletPass.stub',
          {},
          {
            defaultValue: 'Wallet pass generation is stubbed for v1. Use the QR code to check in.',
          },
        ),
      })
    } catch (err) {
      logger.error('my-tickets GET :id/wallet-pass failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
