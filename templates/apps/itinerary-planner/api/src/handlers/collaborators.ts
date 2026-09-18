import { randomBytes } from 'node:crypto'

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { ItineraryPlannerLimits } from '../tiers.js'

const router = Router()

// Invite tokens are bearer secrets — emailed to a recipient and presented back
// (via ?invite=<token>) to accept a trip invite, so anyone who can guess one
// could hijack the invitation. Math.random is a predictable non-cryptographic
// PRNG; mint invite tokens with a CSPRNG instead. [L2-1]
export const generateInviteToken = (): string => randomBytes(16).toString('base64url')

const inviteSchema = z.object({
  trip_id: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['viewer', 'editor']).optional(),
})

const acceptInviteSchema = z.object({ token: z.string().min(1) })

async function userOwnsTrip(tripId: string, userId: string): Promise<boolean> {
  const trip = await findById<Record<string, unknown>>('trips', tripId)
  return !!trip && trip.user_id === userId
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const tripId = req.query.trip_id ? String(req.query.trip_id) : null
    if (tripId && !(await userOwnsTrip(tripId, userId))) {
      return res
        .status(404)
        .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
    }
    const where = tripId
      ? [{ field: 'trip_id', operator: '=' as const, value: tripId }]
      : [{ field: 'user_id', operator: '=' as const, value: userId }]
    const collaborators = await findMany('trip_collaborators', {
      where,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(collaborators)
  } catch (error) {
    logger.error('collaborators.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<ItineraryPlannerLimits>({
    limitType: 'maxCollaborators',
    getLimit: (limits) => limits.maxCollaborators,
    getCurrent: async (userId) =>
      count('trip_collaborators', [{ field: 'invited_by', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(inviteSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      }
      const data = req.body as z.infer<typeof inviteSchema>
      const trip = await findById<Record<string, unknown>>('trips', data.trip_id)
      if (!trip || trip.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('trip.notFound', undefined, { defaultValue: 'Trip not found.' }) })
      }
      const token = generateInviteToken()
      await create('trip_invites', {
        trip_id: data.trip_id,
        user_id: userId,
        email: data.email,
        token,
        role: data.role ?? 'viewer',
        sent_at: new Date(),
        created_at: new Date(),
      })
      const result = await create('trip_collaborators', {
        trip_id: data.trip_id,
        user_id: userId,
        invited_by: userId,
        role: data.role ?? 'viewer',
        invited_at: new Date(),
        created_at: new Date(),
      })

      // Send the actual invitation email — without this the invite is dead-on-arrival.
      // Mailgun sandbox auto-rejects unknown recipients in test mode; the bond
      // returns a synthetic success in that case so the integration is still exercised.
      const tripName = String(trip.destination ?? trip.name ?? 'Trip')
      const fromAddress =
        process.env.EMAIL_FROM ||
        `Waypoint <postmaster@${process.env.MAILGUN_DOMAIN ?? 'mailgun.test'}>`
      const acceptUrl =
        `${process.env.SITE_ORIGIN ?? 'http://localhost:3000'}/trips/${data.trip_id}` +
        `?invite=${token}`
      let emailMessageId: string | undefined
      try {
        const sendResult = await sendMail({
          from: fromAddress,
          to: data.email,
          subject: t(
            'collaborator.invite.subject',
            { tripName },
            { defaultValue: `You're invited to plan "${tripName}" on Waypoint` },
          ),
          text: t(
            'collaborator.invite.text',
            { tripName, acceptUrl },
            {
              defaultValue:
                `Hi! You've been invited to collaborate on the trip "${tripName}".\n\n` +
                `Open the itinerary here: ${acceptUrl}\n`,
            },
          ),
          html:
            `<p>Hi! You've been invited to collaborate on the trip <strong>${tripName}</strong>.</p>` +
            `<p><a href="${acceptUrl}">Open the itinerary</a></p>`,
        })
        emailMessageId = sendResult.messageId
      } catch (mailError) {
        logger.error('Mailgun delivery failed for collaborator invite', {
          tripId: data.trip_id,
          recipient: data.email,
          error: mailError,
        })
        return res.status(502).json({
          error: t('collaborator.invite.emailFailed', undefined, {
            defaultValue: 'Could not send the invitation email. Please try again.',
          }),
        })
      }

      res.status(201).json({ ...(result.data ?? {}), token, emailMessageId })
    } catch (error) {
      logger.error('collaborators.ts', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

// Redeem an emailed invite token (the ?invite=<token> the collaborator lands on at
// /trips/:id) — the "accept invitation" step. Binds the signed-in user as a real
// collaborator on the trip so trips.ts grants them read access. The 16-byte token is
// the bearer credential; a single-use consume (delete the invite row) prevents replay.
router.post('/accept', validateBody(acceptInviteSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const { token } = req.body as z.infer<typeof acceptInviteSchema>
    const invites = await findMany<Record<string, unknown>>('trip_invites', {
      where: [{ field: 'token', operator: '=', value: token }],
      limit: 1,
    })
    const invite = invites[0]
    // 404 (not 403) on an unknown/consumed token so a caller can't probe valid ones.
    if (!invite) {
      return res.status(404).json({
        error: t('collaborator.invite.invalid', undefined, {
          defaultValue: 'This invitation link is invalid or has already been used.',
        }),
      })
    }
    const tripId = String(invite.trip_id)
    // Idempotent: don't add the same collaborator twice.
    const existing = await findMany('trip_collaborators', {
      where: [
        { field: 'trip_id', operator: '=', value: tripId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (existing.length === 0) {
      await create('trip_collaborators', {
        trip_id: tripId,
        user_id: userId,
        invited_by: invite.user_id,
        role: invite.role ?? 'viewer',
        invited_at: new Date(),
        created_at: new Date(),
      })
    }
    // Single-use: consume the invite so the token can't be replayed.
    await deleteById('trip_invites', String(invite.id))
    res.json({ trip_id: tripId, role: invite.role ?? 'viewer' })
  } catch (error) {
    logger.error('collaborators.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('trip_collaborators', id)
    if (!existing) {
      return res.status(404).json({
        error: t('collaborator.notFound', undefined, { defaultValue: 'Collaborator not found.' }),
      })
    }
    if (
      existing.invited_by !== userId &&
      existing.user_id !== userId &&
      !(await userOwnsTrip(existing.trip_id as string, userId))
    ) {
      return res.status(404).json({
        error: t('collaborator.notFound', undefined, { defaultValue: 'Collaborator not found.' }),
      })
    }
    await deleteById('trip_collaborators', id)
    res.status(204).end()
  } catch (error) {
    logger.error('collaborators.ts', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
