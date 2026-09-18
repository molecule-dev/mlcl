import type { RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { requireAuth } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { broadcast } from '@molecule/api-realtime'
import { index, search as searchIndex } from '@molecule/api-search'

import type { CustomerSupportChatLimits } from '../tiers.js'

const createSchema = z.object({
  visitor_name: z.string().min(1).max(120).optional(),
  visitor_email: z.string().email().optional(),
  subject: z.string().min(1).max(500),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  tags: z.array(z.string()).optional(),
})

const assignSchema = z.object({
  agent_id: z.string().min(1),
})

const prioritySchema = z.object({
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
})

const router = Router()

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const { search, status, agent_id, priority, visitor_email } = req.query
    if (search) {
      try {
        const results = await searchIndex('support_conversations', { text: String(search) })
        const hitDocs = (results.hits ?? []).map((h) => h.document as Record<string, unknown>)
        // If the search index is empty (e.g. async indexing lag in CI),
        // fall back to a DB LIKE scan so the endpoint always returns data.
        if (hitDocs.length === 0) throw new Error('search returned no hits — falling back to DB')
        const filtered = hitDocs.filter((doc) => doc.user_id === userId)
        return res.json(filtered)
      } catch (_error) {
        // Search backend unavailable or returned empty — DB fallback.
        const fallback = await findMany('support_conversations', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'subject', operator: 'ilike', value: String(search) },
          ],
          orderBy: [{ field: 'created_at', direction: 'desc' }],
          limit: 200,
        })
        return res.json(fallback)
      }
    }
    const where: { field: string; operator: '='; value: unknown }[] = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (agent_id) where.push({ field: 'agent_id', operator: '=', value: agent_id })
    if (priority) where.push({ field: 'priority', operator: '=', value: priority })
    // Exact-match contact lookup. Used by the contact detail page to list
    // a contact's conversation history. Goes through the DataStore (not
    // the search index) because email is structured data and must match
    // exactly, not fuzzily.
    if (visitor_email)
      where.push({ field: 'visitor_email', operator: '=', value: String(visitor_email) })
    const conversations = await findMany('support_conversations', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(conversations)
  } catch (error) {
    logger.error('conversations.list failed', error)
    next(error)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const conversation = await findById<Record<string, unknown>>(
      'support_conversations',
      req.params.id as string,
    )
    if (!conversation) {
      return res.status(404).json({
        error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
      })
    }
    if (conversation.user_id && conversation.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    }
    res.json(conversation)
  } catch (error) {
    logger.error('conversations.read failed', error)
    next(error)
  }
})

router.post(
  '/',
  requireAuth,
  enforceLimit<CustomerSupportChatLimits>({
    limitType: 'maxConversations',
    getLimit: (limits) => limits.maxConversations,
    getCurrent: (userId) =>
      count('support_conversations', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  async (req, res, next) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
        errors: parsed.error.issues,
      })
    }
    try {
      const userId = res.locals.session.userId as string
      const result = await create('support_conversations', {
        visitor_name: parsed.data.visitor_name ?? null,
        visitor_email: parsed.data.visitor_email ?? null,
        subject: parsed.data.subject,
        status: 'open',
        priority: parsed.data.priority ?? 'normal',
        agent_id: null,
        user_id: userId,
        tags: parsed.data.tags ?? [],
        created_at: new Date().toISOString(),
      })
      const conversation = result.data as Record<string, unknown> | undefined
      if (conversation) {
        try {
          await index('support_conversations', String(conversation.id), conversation)
        } catch (indexErr) {
          // Index failure is non-fatal but must be visible.
          logger.error('conversations.index failed', indexErr)
        }
        try {
          // Per-conversation rooms: the owner's client joins
          // `conversation:<id>` after navigating into the new conversation,
          // so this reaches them (and any of their other tabs that join) —
          // there is no global room (see lib/realtime-guard.ts).
          await broadcast(
            `conversation:${String(conversation.id)}`,
            'conversation:created',
            conversation,
          )
        } catch (broadcastErr) {
          // Broadcast failure is non-fatal but must be visible.
          logger.error('conversations.broadcast failed', broadcastErr)
        }
        // Roll the new conversation up onto the matching contact's counter. total_conversations
        // (the Contacts list "Conversations" column + the ContactDetail KPI) was hardcoded 0 and
        // never incremented, so it stayed 0 while the contact's conversation history grew.
        const visitorEmail = parsed.data.visitor_email
        if (visitorEmail) {
          try {
            const matches = await findMany<Record<string, unknown>>('contacts', {
              where: [
                { field: 'user_id', operator: '=', value: userId },
                { field: 'email', operator: '=', value: visitorEmail },
              ],
              limit: 1,
            })
            const contact = matches[0]
            if (contact) {
              await updateById('contacts', String(contact.id), {
                total_conversations: Number(contact.total_conversations ?? 0) + 1,
                last_seen_at: new Date().toISOString(),
              })
            }
          } catch (contactErr) {
            logger.error('conversations.contactRollup failed', contactErr)
          }
        }
      }
      res.status(201).json(conversation)
    } catch (error) {
      logger.error('conversations.create failed', error)
      next(error)
    }
  },
)

const ensureOwnership = async (
  conversationId: string,
  userId: string,
  res: Response,
): Promise<Record<string, unknown> | null> => {
  const target = await findById<Record<string, unknown>>('support_conversations', conversationId)
  if (!target) {
    res.status(404).json({
      error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
    })
    return null
  }
  if (target.user_id && target.user_id !== userId) {
    res.status(403).json({ error: t('auth.forbidden', undefined, { defaultValue: 'Forbidden' }) })
    return null
  }
  return target
}

router.put('/:id/assign', requireAuth, async (req, res, next) => {
  const parsed = assignSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    const result = await updateById('support_conversations', req.params.id as string, {
      agent_id: parsed.data.agent_id,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res.status(404).json({
        error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
      })
    }
    try {
      await broadcast(`conversation:${req.params.id}`, 'conversation:assigned', result.data)
    } catch (broadcastErr) {
      logger.error('conversations.broadcast failed', broadcastErr)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('conversations.assign failed', error)
    next(error)
  }
})

router.put('/:id/close', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    const result = await updateById('support_conversations', req.params.id as string, {
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    if (!result.data) {
      return res.status(404).json({
        error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
      })
    }
    try {
      await broadcast(`conversation:${req.params.id}`, 'conversation:closed', result.data)
    } catch (broadcastErr) {
      logger.error('conversations.broadcast failed', broadcastErr)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('conversations.close failed', error)
    next(error)
  }
})

router.put('/:id/reopen', requireAuth, async (req, res, next) => {
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    const result = await updateById('support_conversations', req.params.id as string, {
      status: 'open',
      closed_at: null,
    })
    if (!result.data) {
      return res.status(404).json({
        error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
      })
    }
    try {
      await broadcast(`conversation:${req.params.id}`, 'conversation:reopened', result.data)
    } catch (broadcastErr) {
      logger.error('conversations.broadcast failed', broadcastErr)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('conversations.reopen failed', error)
    next(error)
  }
})

router.put('/:id/priority', requireAuth, async (req, res, next) => {
  const parsed = prioritySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', undefined, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  try {
    const userId = res.locals.session.userId as string
    const owned = await ensureOwnership(req.params.id as string, userId, res)
    if (!owned) return
    const result = await updateById('support_conversations', req.params.id as string, {
      priority: parsed.data.priority,
    })
    if (!result.data) {
      return res.status(404).json({
        error: t('conversations.notFound', undefined, { defaultValue: 'Conversation not found' }),
      })
    }
    try {
      await broadcast(`conversation:${req.params.id}`, 'conversation:updated', result.data)
    } catch (broadcastErr) {
      logger.error('conversations.broadcast failed', broadcastErr)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('conversations.priority failed', error)
    next(error)
  }
})

export default router
