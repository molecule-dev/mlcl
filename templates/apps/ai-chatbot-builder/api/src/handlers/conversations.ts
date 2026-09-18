import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { ChatMessage } from '@molecule/api-ai'
import { requireProvider as requireAI } from '@molecule/api-ai'
import { count, create, findById, findMany } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireBotChildOwnership, requireBotOwnership } from '../lib/authz.js'
import type { AiChatbotBuilderLimits } from '../tiers.js'

const router = Router()

// Enforce the per-tier `maxAiMessagesPerMonth` limit (free=500) the pricing page
// advertises. It is a PER-MONTH cap, so getCurrent counts only THIS month's
// assistant messages — a naive all-time count() would block a user forever once
// they hit the cap once. `messages` has no user_id, so scope via the caller's
// bots (bot_id IN the user's bots), matching the ownership model.
const enforceMonthlyAiMessages = enforceLimit<AiChatbotBuilderLimits>({
  limitType: 'maxAiMessagesPerMonth',
  getLimit: (limits) => limits.maxAiMessagesPerMonth,
  getCurrent: async (userId) => {
    const now = new Date()
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    ).toISOString()
    const bots = await findMany<{ id: string }>('bots', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 500,
    })
    if (bots.length === 0) return 0
    return count('messages', [
      { field: 'bot_id', operator: 'in', value: bots.map((b) => b.id) },
      { field: 'role', operator: '=', value: 'assistant' },
      { field: 'created_at', operator: '>=', value: startOfMonth },
    ])
  },
}) as unknown as RequestHandler

const startConversationSchema = z.object({
  bot_id: z.string().min(1),
  visitor_name: z.string().max(200).optional().default('Visitor'),
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10000),
})

router.use(authorizers.auth())

// List recent conversations across every bot the caller owns. Used by
// the dashboard. Returns an empty array (not 404) when the caller has no
// bots yet, so the UI can render its empty state without an error toast.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const ownedBots = await findMany<{ id: unknown; name?: unknown }>('bots', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 500,
    })
    if (ownedBots.length === 0) {
      res.json([])
      return
    }
    const botIds = ownedBots.map((b) => String(b.id))
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 200)

    const conversations = await findMany('conversations', {
      where: [{ field: 'bot_id', operator: 'in', value: botIds }],
      limit,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(conversations)
  } catch (error) {
    logger.error('conversations.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// List conversations for a bot — owner-only.
router.get('/bot/:botId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.botId as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    const { page = '1', limit = '50' } = req.query

    const conversations = await findMany('conversations', {
      where: [{ field: 'bot_id', operator: '=', value: req.params.botId as string }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(conversations)
  } catch (error) {
    logger.error('conversations.listForBot', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get conversation with messages — caller must own the parent bot.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const convCheck = await requireBotChildOwnership<{ id: unknown; bot_id: unknown }>(
      'conversations',
      req.params.id as string,
      userId,
    )
    if (!convCheck.ok) {
      res.status(convCheck.status).json({
        error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
      })
      return
    }
    const messages = await findMany('messages', {
      where: [{ field: 'conversation_id', operator: '=', value: req.params.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    res.json({ ...(convCheck.row as Record<string, unknown>), messages })
  } catch (error) {
    logger.error('conversations.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Start new conversation — owner-side test/preview path; verifies bot ownership.
// Note: real public-widget conversations come in via the channel webhook
// router, which authenticates via api_key_hash + allowed_domain rather
// than user session.
router.post('/', validateBody(startConversationSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { bot_id, visitor_name } = req.body

    const botCheck = await requireBotOwnership<Record<string, unknown>>(String(bot_id), userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    const bot = botCheck.row

    if (bot.status !== 'deployed' && bot.status !== 'draft') {
      res.status(400).json({
        error: t('conversations.botNotDeployed', {}, { defaultValue: 'Bot is not available' }),
      })
      return
    }

    const result = await create('conversations', {
      bot_id,
      visitor_name,
      status: 'active',
      message_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const conversation = result.data as Record<string, unknown>

    if (bot.welcome_message && conversation) {
      await create('messages', {
        conversation_id: conversation.id,
        bot_id,
        role: 'assistant',
        content: String(bot.welcome_message),
        created_at: new Date().toISOString(),
      })
    }

    res.status(201).json(conversation)
  } catch (error) {
    logger.error('conversations.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Send a message and get a bot reply — caller must own the parent bot.
router.post(
  '/:id/messages',
  enforceMonthlyAiMessages,
  validateBody(sendMessageSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const { content } = req.body
      const convCheck = await requireBotChildOwnership<{ bot_id: unknown }>(
        'conversations',
        req.params.id as string,
        userId,
      )
      if (!convCheck.ok) {
        res.status(convCheck.status).json({
          error: t('conversations.notFound', {}, { defaultValue: 'Conversation not found' }),
        })
        return
      }
      const conversation = convCheck.row

      const bot = await findById<Record<string, unknown>>('bots', String(conversation.bot_id))
      if (!bot) {
        res.status(404).json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
        return
      }

      // Save user message
      await create('messages', {
        conversation_id: req.params.id,
        bot_id: conversation.bot_id,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      })

      // Get conversation history
      const history = await findMany<Record<string, unknown>>('messages', {
        where: [{ field: 'conversation_id', operator: '=', value: req.params.id }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
      })

      // Fetch knowledge base context from database
      const knowledgeDocs = await findMany<Record<string, unknown>>('knowledge_documents', {
        where: [
          { field: 'bot_id', operator: '=', value: String(conversation.bot_id) },
          { field: 'status', operator: '=', value: 'indexed' },
        ],
        limit: 3,
      })

      const context = knowledgeDocs.map((d) => String(d.content)).join('\n\n')

      const systemPrompt = context
        ? `${String(bot.system_prompt)}\n\nRelevant context:\n${context}`
        : String(bot.system_prompt)

      const aiMessages: ChatMessage[] = history.map((m) => ({
        role: String(m.role) as 'user' | 'assistant',
        content: String(m.content),
      }))

      // Get AI response via streaming
      const aiProvider = requireAI()
      const stream = aiProvider.chat({
        messages: aiMessages,
        system: systemPrompt,
        // Use the bot's configured model (a stored, user-selected column) rather than letting the
        // call fall through to the AI bond's default — the model picker was previously ignored.
        model: String(bot.model),
        maxTokens: Number(bot.max_tokens) || 1024,
        // A valid temperature of 0 (the "Precision"/deterministic slider endpoint) must be
        // honored; `Number(bot.temperature) || 0.7` wrongly treated 0 as unset → always 0.7.
        temperature:
          bot.temperature != null && Number.isFinite(Number(bot.temperature))
            ? Number(bot.temperature)
            : 0.7,
      })

      let responseContent = ''
      let tokensUsed = 0
      for await (const event of stream) {
        if (event.type === 'text') responseContent += event.content
        if (event.type === 'done')
          tokensUsed = (event.usage?.inputTokens || 0) + (event.usage?.outputTokens || 0)
      }

      // Save assistant response
      const assistantResult = await create('messages', {
        conversation_id: req.params.id,
        bot_id: conversation.bot_id,
        role: 'assistant',
        content: responseContent,
        tokens_used: tokensUsed,
        created_at: new Date().toISOString(),
      })

      res.json(assistantResult.data)
    } catch (error) {
      logger.error('conversations.sendMessage', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
