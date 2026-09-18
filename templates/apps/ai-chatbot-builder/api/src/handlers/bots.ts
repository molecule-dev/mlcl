import { type Request, type RequestHandler, type Response, Router } from 'express'

import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { logger } from '@molecule/api-logger'
import { index as searchIndex, search } from '@molecule/api-search'

async function tryIndex(id: string, doc: Record<string, unknown>): Promise<void> {
  try {
    await searchIndex('bots', id, doc)
  } catch (_error) {
    /* swallow — search-indexing failures should not surface as 500s */
  }
}
import { z } from 'zod'

import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireBotOwnership } from '../lib/authz.js'
import type { AiChatbotBuilderLimits } from '../tiers.js'

const router = Router()

const createBotSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  system_prompt: z.string().max(10000).optional().default(''),
  model: z.string().optional().default('claude-sonnet-4-6'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().int().min(1).max(4096).optional().default(1024),
  welcome_message: z.string().max(1000).optional().default(''),
})

const updateBotSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  system_prompt: z.string().max(10000).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(4096).optional(),
  welcome_message: z.string().max(1000).optional(),
})

router.use(authorizers.auth())

// List bots — owner-scoped.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, page = '1', limit = '50' } = req.query
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: String(status) })

    const bots = await findMany('bots', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(bots)
  } catch (error) {
    logger.error('bots.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Search bots — owner-scoped via post-filter on the index hit set.
router.get('/search', async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const { q } = req.query
  if (!q) {
    res
      .status(400)
      .json({ error: t('bots.searchRequired', {}, { defaultValue: 'Search query is required' }) })
    return
  }
  try {
    const results = await search('bots', { text: String(q) })
    const hits = (results as unknown as { hits?: Array<Record<string, unknown>> }).hits ?? []
    const owned = hits.filter((h) => String(h.owner_id) === String(userId))
    res.json({ ...(results as unknown as Record<string, unknown>), hits: owned })
  } catch (error) {
    logger.warn('bots.search', error)
    res.json({ hits: [], query: String(q), processingTimeMs: 0 })
  }
})

// Get bot details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.id as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    res.json(botCheck.row)
  } catch (error) {
    logger.error('bots.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create bot — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<AiChatbotBuilderLimits>({
    limitType: 'maxBots',
    getLimit: (limits) => limits.maxBots,
    getCurrent: async (userId) =>
      count('bots', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createBotSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const { name, description, system_prompt, model, temperature, max_tokens, welcome_message } =
        req.body

      const result = await create('bots', {
        name,
        description,
        system_prompt,
        model,
        temperature,
        max_tokens,
        welcome_message,
        status: 'draft',
        owner_id: userId,
        conversation_count: 0,
        message_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const bot = result.data
      if (bot) {
        await tryIndex(String(bot.id), bot as Record<string, unknown>)
      }
      res.status(201).json(bot)
    } catch (error) {
      logger.error('bots.create', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update bot — owner-only.
router.put('/:id', validateBody(updateBotSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.id as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }

    const result = await updateById('bots', req.params.id as string, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    const updated = result.data
    if (updated) {
      await tryIndex(String(updated.id), updated as Record<string, unknown>)
    }
    res.json(updated)
  } catch (error) {
    logger.error('bots.update', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Deploy bot — owner-only.
router.post('/:id/deploy', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.id as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }

    const result = await updateById('bots', req.params.id as string, {
      status: 'deployed',
      deployed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('bots.deploy', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Pause bot — owner-only.
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.id as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }

    const result = await updateById('bots', req.params.id as string, {
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('bots.pause', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete bot — owner-only.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.id as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    await deleteById('bots', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('bots.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get bot stats — owner-only (aggregate counts of conversations + messages).
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const botCheck = await requireBotOwnership(req.params.id as string, userId)
    if (!botCheck.ok) {
      res
        .status(botCheck.status)
        .json({ error: t('bots.notFound', {}, { defaultValue: 'Bot not found' }) })
      return
    }
    const totalConversations = await count('conversations', [
      { field: 'bot_id', operator: '=', value: req.params.id },
    ])
    const totalMessages = await count('messages', [
      { field: 'bot_id', operator: '=', value: req.params.id },
    ])

    res.json({
      total_conversations: totalConversations,
      total_messages: totalMessages,
    })
  } catch (error) {
    logger.error('bots.stats', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
