/**
 * Conversation handlers — list / read / create / delete conversations,
 * plus a "send a message and get an AI response" sub-route.
 *
 * Architecture:
 *   - All persistence flows through `@molecule/api-database`'s DataStore
 *     (`findById`, `findMany`, `create`, `updateById`, `deleteById`).
 *     No raw SQL — gate G3.
 *   - All AI calls flow through the bonded `@molecule/api-ai` provider
 *     (Anthropic by default in this template) — gate G15.
 *   - All inputs validated with zod — gate G5.
 *   - Every per-id read/update/delete scopes by `user_id` to prevent
 *     IDOR — gate G6.
 */

import { Router } from 'express'
import { z } from 'zod'

import { requireProvider as requireAi } from '@molecule/api-ai'
import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

interface ConversationRow {
  id: string
  user_id: string
  agent_id: string | null
  title: string
  mode: string
  message_count: number
  total_seconds_spoken?: number
}

interface AgentRow {
  id: string
  user_id: string
  name: string
  system_prompt: string
  voice_id: string | null
  model: string
}

interface MessageRow {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  type: string
  created_at: string
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful voice assistant. Keep responses concise and conversational, suitable for text-to-speech output.'

const router = Router()

const createSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  mode: z.enum(['assistant', 'agent']).optional(),
  agent_id: z.string().uuid().optional(),
})

const sendMessageSchema = z.object({
  content: z.string().min(1).max(20_000),
  role: z.enum(['user', 'assistant', 'system']).optional(),
  type: z.enum(['text', 'voice']).optional(),
  duration_ms: z.number().int().nonnegative().optional(),
})

/** Resolves the authenticated user id from the session (set by the user-resource auth middleware). */

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
    console.error(error)
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
    console.error(error)
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
      agent_id: body.data.agent_id ?? null,
      title:
        body.data.title ??
        t('conversations.defaultTitle', {}, { defaultValue: 'New Conversation' }),
      mode: body.data.mode ?? 'assistant',
      message_count: 0,
    })
    res.status(201).json(result.data)
  } catch (error) {
    console.error(error)
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
      role: body.data.role ?? 'user',
      content: body.data.content,
      type: body.data.type ?? 'text',
      duration_ms: body.data.duration_ms ?? null,
    })

    const history = await findMany<MessageRow>('messages', {
      where: [{ field: 'conversation_id', operator: '=', value: params.data.id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })

    // If the conversation is bound to a persona/agent, apply that
    // agent's system_prompt so the assistant actually adopts the
    // persona the user configured. Without this lookup the agent_id
    // column is pure write-only state — every reply would speak in
    // the same default voice no matter which persona the user picked.
    let systemPrompt = DEFAULT_SYSTEM_PROMPT
    // Undefined lets the provider fall back to its default model; a configured
    // agent overrides it below.
    let model: string | undefined
    if (conversation.agent_id) {
      const agent = await findById<AgentRow>('agents', conversation.agent_id)
      // Scope by the same userId — an attacker can't steal another user's
      // persona by setting agent_id on their own conversation. (G6 IDOR.)
      if (agent && agent.user_id === userId) {
        if ((agent.system_prompt ?? '').trim().length > 0) systemPrompt = agent.system_prompt
        // Honor the agent's configured model. It was stored + editable but never
        // reached the chat call, so every reply used the provider default no
        // matter which model the user picked.
        if ((agent.model ?? '').trim().length > 0) model = agent.model
      }
    }

    const ai = requireAi()
    let assistantText = ''
    for await (const event of ai.chat({
      system: systemPrompt,
      model,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    })) {
      if (event.type === 'text') assistantText += event.content
      if (event.type === 'error') throw new Error(event.message)
    }

    const assistantMessage = await create<MessageRow>('messages', {
      conversation_id: params.data.id,
      role: 'assistant',
      content: assistantText,
      type: body.data.type === 'voice' ? 'voice' : 'text',
    })

    // Track total seconds spoken when this turn was a voice message so the
    // History page's "X minutes logged" tile reflects reality.
    const totalSecondsToAdd = body.data.duration_ms
      ? Math.max(0, Math.round(body.data.duration_ms / 1000))
      : 0
    await updateById('conversations', params.data.id, {
      message_count: history.length + 1,
      ...(totalSecondsToAdd > 0
        ? {
            total_seconds_spoken: (conversation.total_seconds_spoken ?? 0) + totalSecondsToAdd,
          }
        : {}),
    })

    res.json({ userMessage: userMessage.data, assistantMessage: assistantMessage.data })
  } catch (error) {
    console.error(error)
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
    console.error(error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
