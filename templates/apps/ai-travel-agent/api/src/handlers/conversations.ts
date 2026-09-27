/**
 * Conversation handlers — list / read / create / delete sessions, plus the
 * turn route: a user message goes in, the travel agent runs its tool loop, and
 * the spoken reply comes back.
 *
 * Architecture:
 *   - Persistence flows through `@molecule/api-database`'s DataStore. No raw SQL.
 *   - The agent loop is the bonded `@molecule/api-ai-agents` provider over the
 *     bonded `@molecule/api-ai` chat provider; tools live in `lib/travel-agent.ts`.
 *   - Inputs validated with zod; every per-id read scopes by `user_id`.
 */

import { Router } from 'express'
import { z } from 'zod'

import { requireProvider as requireAgents } from '@molecule/api-ai-agents'
import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { buildTools, systemPrompt } from '../lib/travel-agent.js'

interface ConversationRow {
  id: string
  user_id: string
  title: string
  message_count: number
  total_seconds_spoken?: number
}

interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  type: string
  tool_calls: unknown
  created_at: string
}

/** What the UI shows for each tool the agent used on a turn. */
export interface ToolCallSummary {
  name: string
  input: unknown
  result: unknown
  isError: boolean
}

const router = Router()

const createSchema = z.object({
  title: z.string().min(1).max(500).optional(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(20_000),
  type: z.enum(['text', 'voice']).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
})

/** Keep tool results readable in the transcript: cap what is stored. */
function trim(value: unknown): unknown {
  const text = JSON.stringify(value ?? null)
  return text.length > 4000 ? `${text.slice(0, 4000)}…` : value
}

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const conversations = await findMany<ConversationRow>('conversations', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(conversations)
  } catch (error) {
    logger.error('conversations.list', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const conversation = await findById<ConversationRow>('conversations', params.data.id)
    if (!conversation || conversation.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const messages = await findMany<MessageRow>('messages', {
      where: [{ field: 'conversation_id', operator: '=', value: params.data.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json({ ...conversation, messages })
  } catch (error) {
    logger.error('conversations.get', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/', async (req, res) => {
  try {
    const body = createSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const result = await create<ConversationRow>('conversations', {
      user_id: userId,
      title: body.data.title ?? t('conversations.defaultTitle', {}, { defaultValue: 'New trip' }),
      message_count: 0,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('conversations.create', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.post('/:id/messages', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    const body = sendMessageSchema.safeParse(req.body)
    if (!params.success || !body.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const conversation = await findById<ConversationRow>('conversations', params.data.id)
    if (!conversation || conversation.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }

    const userMessage = await create<MessageRow>('messages', {
      conversation_id: params.data.id,
      role: 'user',
      content: body.data.content,
      type: body.data.type ?? 'text',
      duration_ms: body.data.duration_ms ?? null,
    })

    const history = await findMany<MessageRow>('messages', {
      where: [{ field: 'conversation_id', operator: '=', value: params.data.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    // The agent loop: the model may call several tools before it answers. Each
    // tool is scoped to this user, so a booking or a split can only touch what
    // the user owns.
    const startedAt = Date.now()
    const run = await requireAgents().run({
      system: systemPrompt(),
      messages: history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
      tools: buildTools(userId, params.data.id),
      maxSteps: 8,
      maxTokens: 1024,
    })
    const toolCalls: ToolCallSummary[] = run.steps.flatMap((step) =>
      step.toolCalls.map((call) => ({
        name: call.name,
        input: call.input,
        result: trim(call.result),
        isError: Boolean(call.isError),
      })),
    )

    const assistantMessage = await create<MessageRow>('messages', {
      conversation_id: params.data.id,
      role: 'assistant',
      content: run.output,
      type: body.data.type === 'voice' ? 'voice' : 'text',
      tool_calls: JSON.stringify(toolCalls),
      latency_ms: Date.now() - startedAt,
      tokens_used: (run.usage?.inputTokens ?? 0) + (run.usage?.outputTokens ?? 0),
    })

    const totalSecondsToAdd = body.data.duration_ms
      ? Math.max(0, Math.round(body.data.duration_ms / 1000))
      : 0
    // The first message names the session, so the trips list reads well.
    const title = history.length <= 1 ? body.data.content.slice(0, 80) : conversation.title
    await updateById('conversations', params.data.id, {
      title,
      message_count: history.length + 1,
      updated_at: new Date(),
      ...(totalSecondsToAdd > 0
        ? {
            total_seconds_spoken: (conversation.total_seconds_spoken ?? 0) + totalSecondsToAdd,
          }
        : {}),
    })

    res.json({
      userMessage: userMessage.data,
      assistantMessage: { ...assistantMessage.data, tool_calls: toolCalls },
    })
  } catch (error) {
    logger.error('conversations.sendMessage', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const params = idParamSchema.safeParse(req.params)
    if (!params.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const conversation = await findById<ConversationRow>('conversations', params.data.id)
    if (!conversation || conversation.user_id !== userId) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    await deleteById('conversations', params.data.id)
    res.status(204).send()
  } catch (error) {
    logger.error('conversations.delete', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
