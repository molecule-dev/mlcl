/**
 * Meetings handler — CRUD for meetings + lifecycle (start/end) + invite-by-email.
 *
 * Authorization: meeting access requires host, workspace member, or joined
 * participant. Lifecycle and update/delete are host-only.
 */

import { randomBytes } from 'node:crypto'

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'

import { loadMeeting, requireMeetingAccess, requireMeetingHost } from '../lib/authz.js'

const createSchema = z.object({
  workspace_id: z.string().min(1).optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2_000).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  is_recurring: z.boolean().optional().default(false),
  recurrence_rule: z.string().max(500).optional(),
  password_hash: z.string().max(200).optional(),
  waiting_room_enabled: z.boolean().optional().default(true),
  max_participants: z.number().int().min(2).max(500).optional().default(10),
  invite_emails: z.array(z.string().email()).max(100).optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2_000).optional(),
  starts_at: z.string().datetime().optional(),
  ends_at: z.string().datetime().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.string().max(500).optional(),
  waiting_room_enabled: z.boolean().optional(),
  max_participants: z.number().int().min(2).max(500).optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    const where: Array<{ field: string; operator: '='; value: string }> = [
      { field: 'host_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    const meetings = await findMany('meetings', {
      where,
      orderBy: [{ field: 'starts_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(meetings)
  } catch (error) {
    logger.error('meetings.list', error)
    res.status(500).json({
      error: t('meetings.listError', undefined, { defaultValue: 'Failed to list meetings' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingAccess(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    res.json(check.row)
  } catch (error) {
    logger.error('meetings.read', error)
    res.status(500).json({
      error: t('meetings.readError', undefined, { defaultValue: 'Failed to read meeting' }),
    })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const data = parsed.data
    const joinCode = randomBytes(6).toString('hex')
    const result = await create('meetings', {
      workspace_id: data.workspace_id ?? null,
      host_id: userId,
      title: data.title,
      description: data.description ?? null,
      status: 'scheduled',
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      is_recurring: data.is_recurring ?? false,
      recurrence_rule: data.recurrence_rule ?? null,
      join_code: joinCode,
      password_hash: data.password_hash ?? null,
      waiting_room_enabled: data.waiting_room_enabled ?? true,
      max_participants: data.max_participants ?? 10,
      created_at: new Date().toISOString(),
    })
    const meeting = result.data as { id?: string } | undefined
    if (!meeting?.id) {
      res.status(500).json({
        error: t('meetings.createError', undefined, { defaultValue: 'Failed to create meeting' }),
      })
      return
    }

    // Send invites + persist invite rows for each email.
    const inviteEmails = data.invite_emails ?? []
    for (const email of inviteEmails) {
      const token = randomBytes(16).toString('hex')
      try {
        await create('meeting_invites', {
          meeting_id: meeting.id,
          invitee_email: email,
          invitee_user_id: null,
          token,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
      } catch (_error) {
        // dedupe unique-conflict is non-fatal
      }
      try {
        await sendMail({
          from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
          to: email,
          subject: t(
            'meetings.inviteSubject',
            { title: data.title },
            {
              defaultValue: `Invitation: ${data.title}`,
            },
          ),
          text: t(
            'meetings.inviteBody',
            { code: joinCode, title: data.title },
            { defaultValue: `You're invited to ${data.title}. Join code: ${joinCode}` },
          ),
        })
      } catch (_error) {
        // email delivery failures are non-fatal in test envs
      }
    }

    res.status(201).json(meeting)
  } catch (error) {
    logger.error('meetings.create', error)
    res.status(500).json({
      error: t('meetings.createError', undefined, { defaultValue: 'Failed to create meeting' }),
    })
  }
})

router.put('/:id', async (req: Request, res: Response) => {
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
    const check = await requireMeetingHost(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const result = await updateById('meetings', req.params.id as string, {
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('meetings.update', error)
    res.status(500).json({
      error: t('meetings.updateError', undefined, { defaultValue: 'Failed to update meeting' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingHost(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    await deleteById('meetings', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('meetings.delete', error)
    res.status(500).json({
      error: t('meetings.deleteError', undefined, { defaultValue: 'Failed to delete meeting' }),
    })
  }
})

router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingHost(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const result = await updateById('meetings', req.params.id as string, {
      status: 'live',
      started_at: new Date().toISOString(),
    })
    try {
      await broadcast(`meeting:${req.params.id}`, 'meeting:started', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal — meeting status already updated
    }
    res.json(result.data)
  } catch (error) {
    logger.error('meetings.start', error)
    res.status(500).json({
      error: t('meetings.startError', undefined, { defaultValue: 'Failed to start meeting' }),
    })
  }
})

router.post('/:id/end', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingHost(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const result = await updateById('meetings', req.params.id as string, {
      status: 'ended',
      ended_at: new Date().toISOString(),
    })
    try {
      await broadcast(`meeting:${req.params.id}`, 'meeting:ended', result.data)
    } catch (_error) {
      // broadcast failure is non-fatal — meeting status already updated
    }
    res.json(result.data)
  } catch (error) {
    logger.error('meetings.end', error)
    res.status(500).json({
      error: t('meetings.endError', undefined, { defaultValue: 'Failed to end meeting' }),
    })
  }
})

/**
 * POST /:id/invite — host-only. Creates per-email invite rows + sends mail.
 */
const inviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(100),
})

router.post('/:id/invite', async (req: Request, res: Response) => {
  const parsed = inviteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
    return
  }
  try {
    const userId = res.locals.session.userId as string
    const check = await requireMeetingHost(req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('meetings.notFound', undefined, { defaultValue: 'Meeting not found' }),
      })
      return
    }
    const meetingRow = check.row as { join_code?: string; title?: string }
    const joinCode = String(meetingRow.join_code ?? '')
    const title = String(meetingRow.title ?? 'meeting')
    const sent: string[] = []
    for (const email of parsed.data.emails) {
      const token = randomBytes(16).toString('hex')
      try {
        await create('meeting_invites', {
          meeting_id: req.params.id,
          invitee_email: email,
          invitee_user_id: null,
          token,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        })
      } catch (_error) {
        // dedupe unique-conflict is non-fatal
      }
      try {
        await sendMail({
          from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
          to: email,
          subject: t('meetings.inviteSubject', { title }, { defaultValue: `Invitation: ${title}` }),
          text: t(
            'meetings.inviteBody',
            { code: joinCode, title },
            { defaultValue: `You're invited to ${title}. Join code: ${joinCode}` },
          ),
        })
      } catch (_error) {
        // email delivery failures are non-fatal in test envs
      }
      sent.push(email)
    }
    res.json({ sent })
  } catch (error) {
    logger.error('meetings.invite', error)
    res.status(500).json({
      error: t('meetings.inviteError', undefined, { defaultValue: 'Failed to send invites' }),
    })
  }
})

router.get('/by-code/:code', async (req: Request, res: Response) => {
  try {
    const rows = await findMany<Record<string, unknown>>('meetings', {
      where: [{ field: 'join_code', operator: '=', value: req.params.code }],
      limit: 1,
    })
    const meeting = rows[0]
    if (!meeting) {
      res.status(404).json({
        error: t('meetings.invalidCode', undefined, { defaultValue: 'Invalid meeting code' }),
      })
      return
    }
    // Public-by-code lookup returns minimal info only — guests need this to see
    // whether the code is valid before joining the lobby.
    res.json({
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      waiting_room_enabled: meeting.waiting_room_enabled,
    })
  } catch (error) {
    logger.error('meetings.byCode', error)
    res.status(500).json({
      error: t('meetings.codeLookupError', undefined, {
        defaultValue: 'Failed to look up meeting',
      }),
    })
  }
})

router.get('/stats/summary', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const total = await count('meetings', [{ field: 'host_id', operator: '=', value: userId }])
    res.json({ total })
  } catch (error) {
    logger.error('meetings.stats', error)
    res.status(500).json({
      error: t('meetings.statsError', undefined, { defaultValue: 'Failed to compute stats' }),
    })
  }
})

export { loadMeeting }
export default router
