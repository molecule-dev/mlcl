/**
 * Meeting invites handler — list invites per meeting + accept by token.
 *
 * Authorization: list requires meeting host. Accept-by-token is intentionally
 * authenticated-only; an authed user can accept any invite they have the token
 * for (the token is the bearer credential).
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { requireMeetingHost } from '../lib/authz.js'

const acceptSchema = z.object({
  token: z.string().min(1).max(200),
})

const router = Router()

router.use(requireAuth)

router.get('/by-meeting/:meetingId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingHost(req.params.meetingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const invites = await findMany('meeting_invites', {
      where: [{ field: 'meeting_id', operator: '=', value: req.params.meetingId }],
      orderBy: [{ field: 'sent_at', direction: 'desc' }],
    })
    res.json(invites)
  } catch (error) {
    logger.error('invites.list', error)
    res.status(500).json({
      error: t('invites.listError', undefined, { defaultValue: 'Failed to list invites' }),
    })
  }
})

router.post('/accept', async (req: Request, res: Response) => {
  const parsed = acceptSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const matches = await findMany<{ id: string; meeting_id: string }>('meeting_invites', {
      where: [{ field: 'token', operator: '=', value: parsed.data.token }],
      limit: 1,
    })
    const invite = matches[0]
    if (!invite?.id) {
      res.status(404).json({
        error: t('invites.notFound', undefined, { defaultValue: 'Invite not found' }),
      })
      return
    }
    await updateById('meeting_invites', invite.id, {
      invitee_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    // Auto-add participant row so the user can immediately access chat /
    // participants endpoints for the meeting.
    try {
      await create('meeting_participants', {
        meeting_id: invite.meeting_id,
        user_id: userId,
        role: 'attendee',
        joined_at: new Date().toISOString(),
        audio_enabled: true,
        video_enabled: true,
        created_at: new Date().toISOString(),
      })
    } catch (_error) {
      // duplicate-participant unique-conflict is non-fatal
    }
    res.json({ accepted: true, meeting_id: invite.meeting_id })
  } catch (error) {
    logger.error('invites.accept', error)
    res.status(500).json({
      error: t('invites.acceptError', undefined, { defaultValue: 'Failed to accept invite' }),
    })
  }
})

export default router
