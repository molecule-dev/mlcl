import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { generateAiReply } from '../lib/ai-reply.js'
import { requireOwnership } from '../lib/authz.js'
import type { AiCustomerServiceBotLimits } from '../tiers.js'

const router = Router()

const startConversationSchema = z.object({
  customerName: z.string().max(200).optional(),
  customerEmail: z.string().email().max(320).optional(),
  channel: z.string().max(64).optional().default('web'),
  initialMessage: z.string().max(10_000).optional(),
  /**
   * When true (default for `initialMessage`) the bot will auto-reply
   * after the customer's opening message is persisted. Tests and the
   * "I'll handle it manually" UI option can pass `false` to skip.
   */
  autoReply: z.boolean().optional(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
  /**
   * Distinguish operator messages (default) from inbound customer
   * simulations. Posting a `customer` message also fires the bot reply
   * pipeline so the operator can see how the AI would respond live.
   */
  sender: z.enum(['agent', 'customer']).optional().default('agent'),
  autoReply: z.boolean().optional(),
})

const closeConversationSchema = z.object({
  satisfactionScore: z.number().int().min(1).max(5).optional(),
})

router.use(authorizers.auth())

// List conversations — owner-scoped.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, channel, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })
    if (channel) where.push({ field: 'channel', operator: '=', value: String(channel) })

    const conversations = await findMany('conversations', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'last_message_at', direction: 'desc' }],
    })
    res.json(conversations)
  } catch (error) {
    logger.error('conversations.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get conversation with messages — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('conversations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }

    const messages = await findMany('messages', {
      where: [{ field: 'conversation_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    res.json({ ...(check.row as Record<string, unknown>), messages })
  } catch (error) {
    logger.error('conversations.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Start new conversation — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<AiCustomerServiceBotLimits>({
    limitType: 'maxConversations',
    getLimit: (limits) => limits.maxConversations,
    getCurrent: async (userId) =>
      count('conversations', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(startConversationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const { customerName, customerEmail, channel, initialMessage } = req.body as {
        customerName?: string
        customerEmail?: string
        channel?: string
        initialMessage?: string
      }
      const now = new Date().toISOString()

      const result = await create('conversations', {
        owner_id: userId,
        customer_name:
          customerName ?? t('conversations.anonymous', {}, { defaultValue: 'Anonymous' }),
        customer_email: customerEmail ?? null,
        channel: channel ?? 'web',
        status: 'open',
        escalated: false,
        message_count: initialMessage ? 1 : 0,
        started_at: now,
        last_message_at: initialMessage ? now : null,
        created_at: now,
        updated_at: now,
      })

      const conversation = result.data as Record<string, unknown> | null

      const autoReply = (req.body as { autoReply?: boolean }).autoReply ?? true

      if (initialMessage && conversation) {
        await create('messages', {
          conversation_id: conversation.id,
          sender: 'customer',
          role: 'user',
          content: initialMessage,
          created_at: now,
        })

        if (autoReply) {
          try {
            await generateAiReply({
              conversation: {
                id: String(conversation.id),
                owner_id: userId,
                customer_name: (conversation.customer_name as string | null) ?? null,
                message_count: 1,
              },
              ownerId: userId,
            })
          } catch (replyErr) {
            logger.error('conversations.autoReply', replyErr)
          }
        }
      }

      res.status(201).json(conversation)
    } catch (err) {
      logger.error('conversations.create', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Send a message in a conversation — owner-only.
//
// Operators send `agent` messages by default. Posting a `customer` message
// is the way the operator simulates an inbound from the customer; the bot
// auto-reply pipeline then runs unless `autoReply: false` is sent.
router.post(
  '/:id/messages',
  validateBody(sendMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const {
        content,
        sender = 'agent',
        autoReply,
      } = req.body as { content: string; sender?: 'agent' | 'customer'; autoReply?: boolean }
      const check = await requireOwnership('conversations', req.params.id as string, userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
        })
        return
      }

      const now = new Date().toISOString()
      const created = await create('messages', {
        conversation_id: req.params.id as string,
        sender,
        role: sender === 'customer' ? 'user' : 'assistant',
        content,
        created_at: now,
      })

      const conv = check.row as Record<string, unknown>
      const newCount = (Number(conv.message_count) || 0) + 1
      await updateById('conversations', req.params.id as string, {
        message_count: newCount,
        last_message_at: now,
        updated_at: now,
      })

      let aiReply: Record<string, unknown> | undefined
      const shouldAutoReply = sender === 'customer' && autoReply !== false
      if (shouldAutoReply) {
        try {
          const result = await generateAiReply({
            conversation: {
              id: req.params.id as string,
              owner_id: userId,
              customer_name: (conv.customer_name as string | null) ?? null,
              message_count: newCount,
            },
            ownerId: userId,
          })
          aiReply = result.message
        } catch (err) {
          logger.error('conversations.autoReply', err)
        }
      }

      res.status(201).json({ ...(created.data as Record<string, unknown>), aiReply })
    } catch (error) {
      logger.error('conversations.sendMessage', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Generate a fresh AI reply on demand — owner-only. Useful for "Suggest
// reply (AI)" buttons or for operators who turned off auto-reply.
router.post('/:id/ai-reply', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('conversations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }
    const conv = check.row as Record<string, unknown>
    const result = await generateAiReply({
      conversation: {
        id: req.params.id as string,
        owner_id: userId,
        customer_name: (conv.customer_name as string | null) ?? null,
        message_count: Number(conv.message_count) || 0,
      },
      ownerId: userId,
    })
    res.status(201).json(result)
  } catch (err) {
    logger.error('conversations.aiReply', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Escalate conversation to a human — owner-only.
router.post('/:id/escalate', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('conversations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }
    const now = new Date().toISOString()
    await updateById('conversations', req.params.id as string, {
      escalated: true,
      status: 'escalated',
      updated_at: now,
    })
    const escalation = await create('escalations', {
      owner_id: userId,
      conversation_id: req.params.id as string,
      requested_at: now,
      summary: '',
      created_at: now,
    })
    res.status(201).json(escalation.data)
  } catch (error) {
    logger.error('conversations.escalate', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Close conversation with optional satisfaction score — owner-only.
router.post(
  '/:id/close',
  validateBody(closeConversationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const check = await requireOwnership('conversations', req.params.id as string, userId)
      if (!check.ok) {
        res.status(check.status).json({
          error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
        })
        return
      }
      const { satisfactionScore } = req.body as { satisfactionScore?: number }
      const now = new Date().toISOString()
      const result = await updateById('conversations', req.params.id as string, {
        status: 'resolved',
        satisfaction_score: satisfactionScore ?? null,
        csat: satisfactionScore ?? null,
        updated_at: now,
      })
      res.json(result.data)
    } catch (error) {
      logger.error('conversations.close', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Delete conversation — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('conversations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }
    await deleteById('conversations', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('conversations.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Helper: list messages for a conversation (used by transcripts) — owner-only.
router.get('/:id/messages', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('conversations', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }
    const messages = await findMany('messages', {
      where: [{ field: 'conversation_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json(messages)
  } catch (error) {
    logger.error('conversations.listMessages', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
