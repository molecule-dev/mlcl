/**
 * Meeting participants handler — join/leave + audio/video/screen-share toggles.
 *
 * Authorization: must have access to the meeting (host, workspace member, or
 * existing participant) to view participants. Updating a participant requires
 * either the participant to be self OR the request user to be the meeting host.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { requireMeetingAccess, requireMeetingHost } from '../lib/authz.js'

const joinSchema = z.object({
  role: z.enum(['host', 'co-host', 'attendee']).optional().default('attendee'),
  guest_name: z.string().max(100).optional(),
})

const updateSchema = z.object({
  audio_enabled: z.boolean().optional(),
  video_enabled: z.boolean().optional(),
  screen_sharing: z.boolean().optional(),
  hand_raised: z.boolean().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/:meetingId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingAccess(req.params.meetingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const participants = await findMany('meeting_participants', {
      where: [{ field: 'meeting_id', operator: '=', value: req.params.meetingId }],
      orderBy: [{ field: 'joined_at', direction: 'asc' }],
    })
    res.json(participants)
  } catch (error) {
    logger.error('participants.list', error)
    res.status(500).json({
      error: t('participants.listError', undefined, {
        defaultValue: 'Failed to list participants',
      }),
    })
  }
})

router.post('/:meetingId/join', async (req: Request, res: Response) => {
  const parsed = joinSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    // Joining is implicitly allowed for any authed user with the meeting id —
    // guests come through a separate code path. The waiting-room flag on the
    // meeting controls whether the host needs to admit them client-side.
    const meeting = await findById<Record<string, unknown>>(
      'meetings',
      String(req.params.meetingId),
    )
    if (!meeting) {
      res
        .status(404)
        .json({ error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }) })
      return
    }
    // Reject joins to a meeting the host has ended (status is set to 'ended' by POST /:id/end).
    // The join path previously ignored the stored status, so an ended meeting could still be joined.
    if (String(meeting.status) === 'ended') {
      res
        .status(409)
        .json({ error: t('meetings.ended', undefined, { defaultValue: 'This meeting has ended' }) })
      return
    }
    // Enforce the meeting's capacity: count participants still in the meeting (left_at IS NULL) and
    // reject a new joiner once it's full. Joining previously created a row unconditionally, so
    // max_participants was stored but never enforced. A participant who is already in may reconnect.
    const maxParticipants = Number(meeting.max_participants ?? 0)
    if (maxParticipants > 0) {
      const rows = await findMany<{ left_at?: unknown; user_id?: unknown }>(
        'meeting_participants',
        {
          where: [{ field: 'meeting_id', operator: '=', value: req.params.meetingId }],
          limit: 1000,
        },
      )
      const active = rows.filter((p) => !p.left_at)
      const alreadyIn = active.some((p) => String(p.user_id) === userId)
      if (!alreadyIn && active.length >= maxParticipants) {
        res
          .status(403)
          .json({ error: t('meetings.full', undefined, { defaultValue: 'This meeting is full' }) })
        return
      }
    }
    const result = await create('meeting_participants', {
      meeting_id: req.params.meetingId,
      user_id: userId,
      guest_name: parsed.data.guest_name ?? null,
      role: parsed.data.role,
      joined_at: new Date().toISOString(),
      audio_enabled: true,
      video_enabled: true,
      screen_sharing: false,
      hand_raised: false,
      created_at: new Date().toISOString(),
    })
    try {
      await broadcast(`meeting:${req.params.meetingId}`, 'participant:joined', {
        ...(result.data as Record<string, unknown>),
        meeting_id: req.params.meetingId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal — participant row persisted
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('participants.join', error)
    res.status(500).json({
      error: t('participants.joinError', undefined, { defaultValue: 'Failed to join meeting' }),
    })
  }
})

router.post('/:meetingId/leave', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const rows = await findMany<{ id: string }>('meeting_participants', {
      where: [
        { field: 'meeting_id', operator: '=', value: req.params.meetingId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    const participant = rows[0]
    if (participant?.id) {
      await updateById('meeting_participants', participant.id, {
        left_at: new Date().toISOString(),
      })
    }
    try {
      await broadcast(`meeting:${req.params.meetingId}`, 'participant:left', {
        user_id: userId,
        meeting_id: req.params.meetingId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal — participant left_at already updated
    }
    res.json({ left: true })
  } catch (error) {
    logger.error('participants.leave', error)
    res.status(500).json({
      error: t('participants.leaveError', undefined, { defaultValue: 'Failed to leave meeting' }),
    })
  }
})

router.put('/:meetingId/:participantId', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const existing = await findById<Record<string, unknown>>(
      'meeting_participants',
      req.params.participantId as string,
    )
    if (!existing) {
      res.status(404).json({
        error: t('participants.notFound', undefined, { defaultValue: 'Participant not found' }),
      })
      return
    }
    // Self-update OR host-override.
    const isSelf = String(existing.user_id) === String(userId)
    if (!isSelf) {
      const check = await requireMeetingHost(String(existing.meeting_id), userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('participants.notFound', undefined, { defaultValue: 'Participant not found' }),
        })
        return
      }
    }
    const result = await updateById(
      'meeting_participants',
      req.params.participantId as string,
      parsed.data,
    )
    try {
      await broadcast(`meeting:${req.params.meetingId}`, 'participant:updated', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal — participant row already updated
    }
    res.json(result.data)
  } catch (error) {
    logger.error('participants.update', error)
    res.status(500).json({
      error: t('participants.updateError', undefined, {
        defaultValue: 'Failed to update participant',
      }),
    })
  }
})

export default router
