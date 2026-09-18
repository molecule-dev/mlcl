/**
 * In-meeting chat handler — list + post messages within a meeting.
 *
 * Authorization: only meeting participants (or the host / workspace member)
 * may view or post to a meeting's chat.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { requireMeetingAccess } from '../lib/authz.js'

const postSchema = z.object({
  content: z.string().min(1).max(4_000),
  guest_name: z.string().max(100).optional(),
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
    const messages = await findMany('meeting_chat', {
      where: [{ field: 'meeting_id', operator: '=', value: req.params.meetingId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
      limit: 500,
    })
    res.json(messages)
  } catch (error) {
    logger.error('chat.list', error)
    res.status(500).json({
      error: t('chat.listError', undefined, { defaultValue: 'Failed to load chat' }),
    })
  }
})

router.post('/:meetingId', async (req: Request, res: Response) => {
  const parsed = postSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingAccess(req.params.meetingId as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const result = await create('meeting_chat', {
      meeting_id: req.params.meetingId,
      user_id: userId,
      guest_name: parsed.data.guest_name ?? null,
      content: parsed.data.content,
      created_at: new Date().toISOString(),
    })
    try {
      await broadcast(`meeting:${req.params.meetingId}`, 'meeting:chat', {
        ...(result.data as Record<string, unknown>),
        meeting_id: req.params.meetingId,
      })
    } catch (_error) {
      // broadcast failure is non-fatal — message persisted
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('chat.post', error)
    res.status(500).json({
      error: t('chat.postError', undefined, { defaultValue: 'Failed to post message' }),
    })
  }
})

export default router
