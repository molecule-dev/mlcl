import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { broadcast } from '@molecule/api-realtime'

import { isContactBlocked, requireConversationParticipant } from '../lib/authz.js'
import { decorateMessages } from './_decorate.js'

const createSchema = z.object({
  conversation_id: z.string().min(1),
  content: z.string().min(1).max(20_000),
  type: z.enum(['text', 'image', 'file', 'audio', 'system']).optional().default('text'),
  media_id: z.string().min(1).optional(),
  reply_to_message_id: z.string().min(1).optional(),
})

const updateSchema = z.object({
  content: z.string().min(1).max(20_000),
})

async function safeDecrypt(value: unknown): Promise<unknown> {
  if (typeof value !== 'string') return value
  try {
    return await decrypt(value)
  } catch (_error) {
    // decryption unavailable — return ciphertext as-is so the message is still visible
    return value
  }
}

async function safeEncrypt(value: string): Promise<string> {
  try {
    return await encrypt(value)
  } catch (_error) {
    // encryption unavailable — store plaintext; bond handles it on read
    return value
  }
}

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const { conversation_id, limit } = req.query

  // Without a conversation_id, return the viewer's most recent messages
  // across all of their conversations. The Inbox uses this to render
  // preview snippets for the right-hand thread pane.
  if (!conversation_id) {
    const memberships = await findMany<{ conversation_id: string }>('conversation_participants', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 500,
    })
    const ids = memberships.map((m) => m.conversation_id).filter(Boolean)
    if (ids.length === 0) {
      res.json([])
      return
    }
    const rows = await findMany<Record<string, unknown>>('messages', {
      where: [{ field: 'conversation_id', operator: 'in', value: ids }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(limit) || 100,
    })
    const decorated = await decorateMessages(rows as never, userId, safeDecrypt)
    res.json(decorated)
    return
  }

  const check = await requireConversationParticipant(String(conversation_id), userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const rows = await findMany<Record<string, unknown>>('messages', {
    where: [{ field: 'conversation_id', operator: '=', value: String(conversation_id) }],
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: Number(limit) || 100,
  })
  const decorated = await decorateMessages(rows as never, userId, safeDecrypt)
  res.json(decorated)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const message = await findById<Record<string, unknown>>('messages', req.params.id as string)
  if (!message) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  const check = await requireConversationParticipant(String(message.conversation_id), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  const [decorated] = await decorateMessages([message] as never, userId, safeDecrypt)
  res.json(decorated)
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
  const userId = res.locals.session.userId as string
  const { conversation_id, content, type, media_id, reply_to_message_id } = parsed.data
  const check = await requireConversationParticipant(conversation_id, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }

  // Enforce contact blocks on 1:1 direct conversations: a block in either direction stops the send.
  // A conversation with exactly two participants is a DM; groups (3+) are exempt. Without this a
  // blocked user could keep messaging freely (isContactBlocked was defined but never called).
  const participants = await findMany<{ user_id: string }>('conversation_participants', {
    where: [{ field: 'conversation_id', operator: '=', value: conversation_id }],
    limit: 3,
  })
  if (participants.length === 2) {
    const otherId = participants.map((p) => p.user_id).find((id) => id !== userId)
    if (
      otherId &&
      ((await isContactBlocked(otherId, userId)) || (await isContactBlocked(userId, otherId)))
    ) {
      res.status(403).json({
        error: t('messages.blocked', undefined, { defaultValue: 'You cannot message this user.' }),
      })
      return
    }
  }

  const encrypted = await safeEncrypt(content)
  const result = await create('messages', {
    conversation_id,
    sender_id: userId,
    content: encrypted,
    type,
    media_id: media_id ?? null,
    reply_to_message_id: reply_to_message_id ?? null,
    created_at: new Date().toISOString(),
  })
  const message = result.data as Record<string, unknown> | undefined
  if (!message) {
    res.status(500).json({
      error: t('messages.createError', undefined, { defaultValue: 'Failed to create message' }),
    })
    return
  }

  await updateById('conversations', conversation_id, {
    last_message_at: new Date().toISOString(),
    last_message_preview: content.slice(0, 200),
    last_sender_id: userId,
  })

  // Increment unread_count on the OTHER participants — keep my own
  // membership zero since I'm the sender.
  const others = await findMany<{ id: string; user_id: string; unread_count: number }>(
    'conversation_participants',
    {
      where: [{ field: 'conversation_id', operator: '=', value: conversation_id }],
      limit: 200,
    },
  )
  for (const m of others) {
    if (String(m.user_id) === String(userId)) continue
    await updateById('conversation_participants', m.id, {
      unread_count: (m.unread_count ?? 0) + 1,
    })
  }

  const [decorated] = await decorateMessages(
    [{ ...message, content: encrypted }] as never,
    userId,
    safeDecrypt,
  )
  try {
    // Deliver to the message's conversation room only — clients join
    // `conversation:<conversationId>` (see lib/realtime-guard.ts), never a
    // global room. The payload is the raw row with PLAINTEXT content plus the
    // hydrated sender_name; receivers derive viewer-specific fields (`self`,
    // receipt state) locally, since a broadcast has no single viewer.
    await broadcast(`conversation:${conversation_id}`, 'message:created', {
      ...message,
      content,
      sender_name: decorated?.sender_name ?? null,
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(201).json(decorated)
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
  const userId = res.locals.session.userId as string
  const existing = await findById<Record<string, unknown>>('messages', req.params.id as string)
  if (!existing) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  if (String(existing.sender_id) !== String(userId)) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  const encrypted = await safeEncrypt(parsed.data.content)
  const result = await updateById('messages', req.params.id as string, {
    content: encrypted,
    is_edited: true,
    edited_at: new Date().toISOString(),
  })
  const updated = result.data as Record<string, unknown> | null
  try {
    await broadcast(`conversation:${String(existing.conversation_id)}`, 'message:updated', {
      ...updated,
      content: parsed.data.content,
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  const [decorated] = await decorateMessages([updated] as never, userId, safeDecrypt)
  res.json(decorated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const existing = await findById<Record<string, unknown>>('messages', req.params.id as string)
  if (!existing) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  if (String(existing.sender_id) !== String(userId)) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  await deleteById('messages', req.params.id as string)
  try {
    await broadcast(`conversation:${String(existing.conversation_id)}`, 'message:deleted', {
      id: req.params.id,
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(204).end()
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const message = await findById<Record<string, unknown>>('messages', req.params.id as string)
  if (!message) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  const check = await requireConversationParticipant(String(message.conversation_id), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  await create('message_receipts', {
    message_id: req.params.id,
    user_id: userId,
    status: 'read',
    at: new Date().toISOString(),
  })
  try {
    // Read receipts go to the conversation room so the sender's open page can
    // flip its ✓/✓✓ ticks live.
    await broadcast(`conversation:${String(message.conversation_id)}`, 'message:read', {
      message_id: req.params.id,
      user_id: userId,
      conversation_id: String(message.conversation_id),
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.json({ read: true })
})

router.post('/:id/delivered', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const message = await findById<Record<string, unknown>>('messages', req.params.id as string)
  if (!message) {
    res
      .status(404)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  const check = await requireConversationParticipant(String(message.conversation_id), userId)
  if (!check.ok) {
    res
      .status(check.status)
      .json({ error: t('messages.notFound', undefined, { defaultValue: 'Message not found' }) })
    return
  }
  await create('message_receipts', {
    message_id: req.params.id,
    user_id: userId,
    status: 'delivered',
    at: new Date().toISOString(),
  })
  try {
    await broadcast(`conversation:${String(message.conversation_id)}`, 'message:delivered', {
      message_id: req.params.id,
      user_id: userId,
      conversation_id: String(message.conversation_id),
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.json({ delivered: true })
})

export default router
