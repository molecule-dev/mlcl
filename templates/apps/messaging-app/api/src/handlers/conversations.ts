import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { broadcast } from '@molecule/api-realtime'

import { isContactBlocked, requireConversationParticipant } from '../lib/authz.js'
import { decorateConversation, decorateConversations, type RawConversation } from './_decorate.js'
import { seedDemoForUserOnce } from './_seed.js'

const createSchema = z.object({
  type: z.enum(['direct', 'group']).optional().default('direct'),
  title: z.string().max(200).optional(),
  participant_ids: z.array(z.string().min(1)).min(1).max(100),
  group_id: z.string().min(1).optional(),
})

const updateSchema = z.object({
  title: z.string().max(200).optional(),
  is_archived: z.boolean().optional(),
})

const router = Router()

router.use(requireAuth)

router.get('/', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  // First-touch seed: ensures a freshly-signed-up user has demo
  // contacts + conversations to look at.
  await seedDemoForUserOnce(userId).catch(() => {
    /* best-effort */
  })
  const memberships = await findMany<{ conversation_id: string }>('conversation_participants', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 500,
  })
  const ids = memberships.map((m) => m.conversation_id).filter(Boolean)
  if (ids.length === 0) {
    res.json([])
    return
  }
  const where: WhereCondition[] = [{ field: 'id', operator: 'in', value: ids }]
  // Filter by archive status when explicitly requested.
  const archivedQuery = req.query.archived
  if (archivedQuery === 'true' || archivedQuery === '1') {
    where.push({ field: 'is_archived', operator: '=', value: true })
  } else if (archivedQuery === 'false' || archivedQuery === '0') {
    where.push({ field: 'is_archived', operator: '=', value: false })
  }
  const rows = await findMany<RawConversation>('conversations', {
    where,
    orderBy: [{ field: 'last_message_at', direction: 'desc' }],
    limit: 200,
  })
  const decorated = await decorateConversations(rows, userId)
  res.json(decorated)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireConversationParticipant<RawConversation>(
    req.params.id as string,
    userId,
  )
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const decorated = await decorateConversation(check.row, userId)
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
  const { participant_ids, type, title, group_id } = parsed.data

  // For 1:1 direct conversations, dedupe: if a direct conversation
  // already exists between exactly these two users, return it instead
  // of creating a duplicate. Without this, every "Start conversation"
  // click would mint a new row.
  if ((type ?? 'direct') === 'direct' && participant_ids.length === 1) {
    const otherId = participant_ids[0]!
    // A block in either direction prevents starting a 1:1 conversation: you can't reach someone
    // who blocked you, and you can't open a chat with someone you've blocked. (isContactBlocked was
    // a purpose-built helper that no code path called, so blocking had no effect.)
    if ((await isContactBlocked(otherId, userId)) || (await isContactBlocked(userId, otherId))) {
      res.status(403).json({
        error: t('conversations.blocked', undefined, {
          defaultValue: 'You cannot start a conversation with this user.',
        }),
      })
      return
    }
    const myMemberships = await findMany<{ conversation_id: string }>('conversation_participants', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 500,
    })
    const myIds = myMemberships.map((m) => m.conversation_id)
    if (myIds.length > 0) {
      const otherMemberships = await findMany<{ conversation_id: string }>(
        'conversation_participants',
        {
          where: [
            { field: 'user_id', operator: '=', value: otherId },
            { field: 'conversation_id', operator: 'in', value: myIds },
          ],
          limit: 500,
        },
      )
      const sharedIds = otherMemberships.map((m) => m.conversation_id)
      if (sharedIds.length > 0) {
        const candidates = await findMany<RawConversation>('conversations', {
          where: [
            { field: 'id', operator: 'in', value: sharedIds },
            { field: 'type', operator: '=', value: 'direct' },
          ],
          limit: 50,
        })
        // Only consider conversations with exactly two participants.
        for (const c of candidates) {
          const partsCount = await count('conversation_participants', [
            { field: 'conversation_id', operator: '=', value: c.id },
          ])
          if (partsCount === 2) {
            const decorated = await decorateConversation(c, userId)
            res.status(200).json(decorated)
            return
          }
        }
      }
    }
  }

  const result = await create('conversations', {
    type,
    title: title ?? null,
    created_by: userId,
    group_id: group_id ?? null,
    created_at: new Date().toISOString(),
  })
  const convo = result.data as RawConversation | undefined
  if (!convo?.id) {
    res.status(500).json({
      error: t('conversations.createError', undefined, {
        defaultValue: 'Failed to create conversation',
      }),
    })
    return
  }

  const memberSet = new Set<string>([userId, ...participant_ids])
  for (const pid of memberSet) {
    await create('conversation_participants', {
      conversation_id: convo.id,
      user_id: pid,
      joined_at: new Date().toISOString(),
      unread_count: 0,
    })
  }

  try {
    // Per-conversation rooms: participants' clients join `conversation:<id>`
    // after navigating into the new conversation, so this reaches them (and
    // anyone who joins later) — there is no global room (see
    // lib/realtime-guard.ts).
    await broadcast(`conversation:${String(convo.id)}`, 'conversation:created', convo)
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  const decorated = await decorateConversation(convo, userId)
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
  const check = await requireConversationParticipant(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const result = await updateById('conversations', req.params.id as string, {
    ...parsed.data,
    updated_at: new Date().toISOString(),
  })
  try {
    await broadcast(`conversation:${req.params.id}`, 'conversation:updated', result.data)
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  const decorated = await decorateConversation(result.data as RawConversation, userId)
  res.json(decorated)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireConversationParticipant(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  await deleteById('conversations', req.params.id as string)
  try {
    await broadcast(`conversation:${req.params.id}`, 'conversation:deleted', {
      id: req.params.id,
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.status(204).end()
})

router.post('/:id/archive', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireConversationParticipant(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const result = await updateById('conversations', req.params.id as string, {
    is_archived: true,
    archived_at: new Date().toISOString(),
  })
  try {
    await broadcast(`conversation:${req.params.id}`, 'conversation:updated', result.data)
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  const decorated = await decorateConversation(result.data as RawConversation, userId)
  res.json(decorated)
})

router.post('/:id/unarchive', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireConversationParticipant(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const result = await updateById('conversations', req.params.id as string, {
    is_archived: false,
    archived_at: null,
  })
  try {
    await broadcast(`conversation:${req.params.id}`, 'conversation:updated', result.data)
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  const decorated = await decorateConversation(result.data as RawConversation, userId)
  res.json(decorated)
})

router.post('/:id/read', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireConversationParticipant(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const memberships = await findMany<{ id: string }>('conversation_participants', {
    where: [
      { field: 'conversation_id', operator: '=', value: req.params.id },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  const member = memberships[0]
  if (member?.id) {
    await updateById('conversation_participants', member.id, {
      last_read_at: new Date().toISOString(),
      unread_count: 0,
    })
  }
  try {
    await broadcast(`conversation:${req.params.id}`, 'conversation:read', {
      conversation_id: req.params.id,
      user_id: userId,
    })
  } catch (_error) {
    // broadcast failures are non-fatal — clients will receive the update on next poll
  }
  res.json({ read: true })
})

router.get('/:id/participants', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const check = await requireConversationParticipant(req.params.id as string, userId)
  if (!check.ok) {
    res.status(check.status).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return
  }
  const participants = await findMany('conversation_participants', {
    where: [{ field: 'conversation_id', operator: '=', value: req.params.id }],
    limit: 200,
  })
  res.json(participants)
})

router.get('/stats/summary', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const total = await count('conversation_participants', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  res.json({ total })
})

export default router
