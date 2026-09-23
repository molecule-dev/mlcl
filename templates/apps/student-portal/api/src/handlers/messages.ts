import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getLogger } from '@molecule/api-bond'
import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { StudentPortalLimits } from '../tiers.js'
import { ensureStudentPortalSeeded } from './_seed.js'

const logger = getLogger()

const router = Router()

const createMessageSchema = z.object({
  recipient_id: z.string().min(1),
  recipient_email: z.email().optional(),
  thread_id: z.string().optional(),
  sender_name: z.string().optional(),
  content: z.string().min(1),
  notify_email: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const folder = String(req.query.folder ?? 'inbox')
  const where: WhereCondition[] =
    folder === 'sent'
      ? [{ field: 'user_id', operator: '=', value: userId }]
      : [{ field: 'recipient_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
  const messages = await findMany('messages', { where, orderBy })
  res.json(messages)
})

router.get('/threads', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  // Inbox messages where the current user is the recipient — collapse
  // to the most-recent message per thread for the inbox list view.
  const inbox = await findMany<{
    id: string
    user_id: string
    recipient_id: string
    thread_id?: string | null
    sender_name?: string | null
    content: string
    read_at?: string | Date | null
    created_at: string | Date
  }>('messages', {
    where: [{ field: 'recipient_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  const byThread = new Map<string, (typeof inbox)[number] & { unread: number }>()
  for (const m of inbox) {
    const threadKey = m.thread_id ?? m.id
    const cur = byThread.get(threadKey)
    if (!cur) {
      byThread.set(threadKey, { ...m, unread: m.read_at ? 0 : 1 })
    } else {
      cur.unread += m.read_at ? 0 : 1
    }
  }
  res.json(Array.from(byThread.values()))
})

router.get('/thread/:threadId', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  await ensureStudentPortalSeeded(userId)
  const threadId = String(req.params.threadId)
  const messages = await findMany<Record<string, unknown>>('messages', {
    where: [{ field: 'thread_id', operator: '=', value: threadId }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
  })
  // IDOR guard — only return if at least one message belongs to the current user.
  const visible = messages.filter((m) => m.user_id === userId || m.recipient_id === userId)
  if (visible.length === 0) {
    return res.status(404).json({
      error: t('messages.notFound', undefined, { defaultValue: 'Message thread not found.' }),
    })
  }
  // Mark all unread inbound as read in one pass.
  for (const m of visible) {
    if (m.recipient_id === userId && !m.read_at) {
      await updateById('messages', String(m.id), { read_at: new Date() })
    }
  }
  res.json(visible)
})

router.post(
  '/',
  enforceLimit<StudentPortalLimits>({
    limitType: 'maxMessages',
    getLimit: (limits) => limits.maxMessages,
    getCurrent: async (userId) =>
      count('messages', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createMessageSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
    }
    const result = await create('messages', {
      user_id: userId,
      recipient_id: req.body.recipient_id,
      recipient_email: req.body.recipient_email ?? null,
      thread_id: req.body.thread_id ?? null,
      sender_name: req.body.sender_name ?? null,
      content: req.body.content,
      notify_email: Boolean(req.body.notify_email),
      read_at: null,
      created_at: new Date(),
    })

    if (req.body.notify_email && req.body.recipient_email) {
      try {
        await sendMail({
          from:
            process.env.EMAIL_FROM ??
            `noreply@${process.env.MAILGUN_DOMAIN ?? 'student-portal.local'}`,
          to: req.body.recipient_email,
          subject: t(
            'messages.emailSubject',
            { sender: req.body.sender_name ?? '' },
            { defaultValue: 'New message from {{sender}}' },
          ),
          text: req.body.content,
        })
      } catch (error) {
        // Email is best-effort; the message itself was persisted. Say why it
        // failed instead of swallowing silently.
        logger.error('messages.notifyEmail', error)
      }
    }

    res.status(201).json(result.data)
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const message = await findById<Record<string, unknown>>('messages', id)
  if (!message || (message.user_id !== userId && message.recipient_id !== userId)) {
    return res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found.' }) })
  }
  if (message.recipient_id === userId && !message.read_at) {
    await updateById('messages', id, { read_at: new Date() })
    message.read_at = new Date().toISOString()
  }
  res.json(message)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized.' }) })
  }
  const id = getParamId(req)
  const message = await findById<Record<string, unknown>>('messages', id)
  if (!message || message.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found.' }) })
  }
  await deleteById('messages', id)
  res.status(204).end()
})

export default router
