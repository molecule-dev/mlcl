import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

function getParamId(req: Request, key = 'ticket_id'): string {
  const v = req.params[key]
  return Array.isArray(v) ? v[0] : v
}

const ticketIdSchema = z.object({ ticket_id: z.string().min(1) })
const transferBodySchema = z.object({
  to_email: z.string().email(),
})

/**
 * POST /:ticket_id — transfer a ticket from the current holder to a new
 * holder identified by email. Authorization: caller MUST be the current
 * ticket holder. If the email matches an existing user, the ticket's
 * user_id flips immediately. Otherwise the transfer is staged with a
 * to_email pending acceptance (handled out-of-band — for v1 we just
 * stage it).
 */
router.post(
  '/:ticket_id',
  validateParams(ticketIdSchema),
  validateBody(transferBodySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const ticketId = getParamId(req)
      const ticket = await findById<Record<string, unknown>>('tickets', ticketId)
      if (!ticket || ticket.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('ticket.notFound', {}, { defaultValue: 'Ticket not found' }) })
      }
      if (ticket.transferable === false) {
        return res.status(409).json({
          error: t('transfer.notAllowed', {}, { defaultValue: 'This ticket is not transferable' }),
        })
      }
      if (ticket.status !== 'issued') {
        return res.status(409).json({
          error: t(
            'transfer.invalidState',
            {},
            { defaultValue: 'Ticket cannot be transferred in its current state' },
          ),
        })
      }

      const recipient = await findOne<Record<string, unknown>>('users', [
        { field: 'email', operator: '=', value: req.body.to_email },
      ])

      const transferRecord = await create<Record<string, unknown>>('ticket_transfers', {
        user_id: userId,
        ticket_id: ticketId,
        from_user_id: userId,
        to_user_id: recipient?.id ?? userId,
        to_email: req.body.to_email,
        accepted_at: recipient ? new Date() : null,
        created_at: new Date(),
      })

      // If recipient exists immediately re-assign the ticket; otherwise leave
      // staged (to_user_id placeholder = sender) until acceptance.
      if (recipient && recipient.id) {
        await updateById('tickets', ticketId, {
          user_id: recipient.id,
          status: 'transferred',
          updated_at: new Date(),
        })
      }
      res.status(201).json(transferRecord.data)
    } catch (err) {
      logger.error('transfers POST failed', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
