/**
 * `/api/calls` — the simulated inbound-call session: start a call, post
 * caller utterances (each runs one voice-agent turn), end the call with an
 * outcome. Lists + detail include the transcript and the agent's tool-call
 * timeline.
 *
 * Turn engines (see `lib/agent.ts`): LLM tool-calling loop via
 * `@molecule/api-ai-agents`, with a deterministic scripted fallback when
 * the AI provider is unreachable (no API key) or when the call was started
 * with `mode: "scripted"` — the scripted engine still executes the real
 * PMS tools, so reservations and `call_actions` rows are identical either
 * way.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import {
  getParamId,
  getUserId,
  uuidParamSchema as idParamSchema,
} from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import {
  agentLanguages,
  type CallActionRow,
  type CallMessageRow,
  type CallRow,
  detectTurnLanguages,
  getVoiceAgent,
  logScriptedFallback,
  runLlmTurn,
  runScriptedTurn,
  type VoiceAgentRow,
} from '../lib/agent.js'
import { scriptedReply } from '../lib/languages.js'

const router = Router()

const listQuerySchema = z.object({
  outcome: z.enum(['booked', 'modified', 'info', 'transferred', 'abandoned']).optional(),
  voice_agent_id: z.string().uuid().optional(),
})

const startSchema = z.object({
  voice_agent_id: z.string().uuid(),
  language: z.string().min(2).max(10).optional(),
  /** "scripted" forces the deterministic engine (e2e / offline demos). */
  mode: z.enum(['scripted', 'llm']).optional(),
  direction: z.enum(['inbound', 'outbound']).optional(),
})

const utteranceSchema = z.object({
  text: z.string().min(1).max(4000),
})

const endSchema = z.object({
  outcome: z.enum(['booked', 'modified', 'info', 'transferred', 'abandoned']).optional(),
})

async function loadCallBundle(id: string): Promise<{
  call: CallRow
  messages: CallMessageRow[]
  actions: CallActionRow[]
} | null> {
  const call = await findOne<CallRow>('calls', [{ field: 'id', operator: '=', value: id }])
  if (!call) return null
  const [messages, actions] = await Promise.all([
    findMany<CallMessageRow>('call_messages', {
      where: [{ field: 'call_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    }),
    findMany<CallActionRow>('call_actions', {
      where: [{ field: 'call_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    }),
  ])
  return { call, messages, actions }
}

async function decorateAgent<T extends { voice_agent_id: string }>(
  rows: readonly T[],
): Promise<Array<T & { voice_agent_name: string | null }>> {
  const agents = await findMany<VoiceAgentRow>('voice_agents', {})
  const nameById = new Map(agents.map((a) => [a.id, a.name]))
  return rows.map((r) => ({ ...r, voice_agent_name: nameById.get(r.voice_agent_id) ?? null }))
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { outcome, voice_agent_id } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = []
    if (outcome) where.push({ field: 'outcome', operator: '=', value: outcome })
    if (voice_agent_id)
      where.push({ field: 'voice_agent_id', operator: '=', value: voice_agent_id })
    const rows = await findMany<CallRow>('calls', {
      ...(where.length > 0 ? { where } : {}),
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit: 100,
    })
    res.json({ data: await decorateAgent(rows) })
  } catch (error) {
    logger.error('calls.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    if (!getUserId(res)) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const bundle = await loadCallBundle(getParamId(req))
    if (!bundle) {
      res.status(404).json({ error: t('calls.notFound', {}, { defaultValue: 'Call not found' }) })
      return
    }
    const agent = await getVoiceAgent(bundle.call.voice_agent_id)
    res.json({
      ...bundle.call,
      voice_agent_name: agent?.name ?? null,
      messages: bundle.messages,
      actions: bundle.actions,
    })
  } catch (error) {
    logger.error('calls.detail', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Start a simulated call. Creates the session and the agent's opening
 * greeting (spoken in the pre-selected language when provided — the
 * simulator's language picker — otherwise the agent's first language).
 */
router.post('/', validateBody(startSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof startSchema>
    const agent = await getVoiceAgent(body.voice_agent_id)
    if (!agent) {
      res
        .status(404)
        .json({ error: t('voiceAgents.notFound', {}, { defaultValue: 'Voice agent not found' }) })
      return
    }

    const languages = agentLanguages(agent)
    const language =
      body.language && languages.includes(body.language) ? body.language : (languages[0] ?? 'en')

    const result = await create<CallRow>('calls', {
      voice_agent_id: agent.id,
      user_id: userId,
      direction: body.direction ?? 'inbound',
      detected_language: body.language ?? null,
      duration_seconds: 0,
      outcome: null,
      summary: null,
      recording_url: null,
      mode: body.mode ?? 'llm',
    })
    const call = (result.data ?? result) as CallRow

    const greeting = scriptedReply(language, 'greeting')
    await create('call_messages', {
      call_id: call.id,
      role: 'agent',
      text: greeting,
      language,
    })

    res.status(201).json({ ...call, voice_agent_name: agent.name, greeting })
  } catch (error) {
    logger.error('calls.start', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Post one caller utterance and run one agent turn. Language detection is
 * deterministic (`lib/languages.ts`); the turn runs on the LLM engine and
 * falls back to the scripted engine on any provider failure, so the call
 * always proceeds.
 */
router.post(
  '/:id/utterance',
  validateParams(idParamSchema),
  validateBody(utteranceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const call = await findOne<CallRow>('calls', [
        { field: 'id', operator: '=', value: getParamId(req) },
      ])
      if (!call) {
        res.status(404).json({ error: t('calls.notFound', {}, { defaultValue: 'Call not found' }) })
        return
      }
      if (call.ended_at) {
        res
          .status(409)
          .json({ error: t('calls.alreadyEnded', {}, { defaultValue: 'This call has ended' }) })
        return
      }
      const agent = await getVoiceAgent(call.voice_agent_id)
      if (!agent) {
        res
          .status(404)
          .json({ error: t('voiceAgents.notFound', {}, { defaultValue: 'Voice agent not found' }) })
        return
      }

      const { text } = req.body as z.infer<typeof utteranceSchema>
      const { detected, reply: replyLanguage } = detectTurnLanguages(text, agent)

      await create('call_messages', {
        call_id: call.id,
        role: 'caller',
        text,
        language: detected,
      })

      const actionsBefore = await findMany<CallActionRow>('call_actions', {
        where: [{ field: 'call_id', operator: '=', value: call.id }],
      })
      const history = await findMany<CallMessageRow>('call_messages', {
        where: [{ field: 'call_id', operator: '=', value: call.id }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
      })

      let reply = ''
      let engine: 'llm' | 'scripted'
      if (call.mode === 'scripted') {
        engine = 'scripted'
        reply = await runScriptedTurn({ call, agent }, text, detected)
      } else {
        engine = 'llm'
        try {
          reply = await runLlmTurn({ call, agent }, history.slice(0, -1), text, detected)
        } catch (error) {
          engine = 'scripted'
          logScriptedFallback(call.id, (error as Error).message)
          reply = await runScriptedTurn({ call, agent }, text, detected)
          await updateById('calls', call.id, { mode: 'scripted' })
        }
      }

      await create('call_messages', {
        call_id: call.id,
        role: 'agent',
        text: reply,
        language: replyLanguage,
      })

      const actionsAfter = await findMany<CallActionRow>('call_actions', {
        where: [{ field: 'call_id', operator: '=', value: call.id }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
      })
      const newActions = actionsAfter.slice(actionsBefore.length)

      // Always track the caller's latest detected language — a caller may
      // start in the greeting's picker language and switch mid-call, and the
      // call record + response must reflect the language actually detected
      // for THIS turn (startCall pre-seeds detected_language from the picker,
      // so an only-when-unset patch would report the stale greeting choice).
      const patch: Record<string, unknown> = { detected_language: detected }

      // Persist the detected language BEFORE responding so a read-after-write
      // GET /calls/:id from the client never races this update.
      await updateById('calls', call.id, patch).catch((error) => {
        logger.error('calls.detectLanguageUpdate', error)
      })

      res.json({
        detected_language: detected,
        reply_language: replyLanguage,
        engine,
        reply,
        actions: newActions,
      })
    } catch (error) {
      logger.error('calls.utterance', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

/** End the call: duration, outcome (inferred when omitted), summary. */
router.put(
  '/:id/end',
  validateParams(idParamSchema),
  validateBody(endSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const call = await findOne<CallRow>('calls', [
        { field: 'id', operator: '=', value: getParamId(req) },
      ])
      if (!call) {
        res.status(404).json({ error: t('calls.notFound', {}, { defaultValue: 'Call not found' }) })
        return
      }
      if (call.ended_at) {
        res.json(call)
        return
      }

      const { outcome } = req.body as z.infer<typeof endSchema>
      const actions = await findMany<CallActionRow>('call_actions', {
        where: [{ field: 'call_id', operator: '=', value: call.id }],
      })
      const inferred =
        outcome ??
        (actions.some((a) => a.tool === 'create_reservation')
          ? 'booked'
          : actions.some((a) => a.tool === 'lookup_reservation')
            ? 'modified'
            : 'info')

      const messages = await findMany<CallMessageRow>('call_messages', {
        where: [{ field: 'call_id', operator: '=', value: call.id }],
        orderBy: [{ field: 'created_at', direction: 'asc' }],
      })
      const lastAgent = [...messages].reverse().find((m) => m.role === 'agent')
      const summary = lastAgent ? lastAgent.text.slice(0, 280) : null

      const started = new Date(call.started_at).getTime()
      const duration = Number.isFinite(started)
        ? Math.max(0, Math.round((Date.now() - started) / 1000))
        : 0

      const result = await updateById<CallRow>('calls', call.id, {
        ended_at: new Date(),
        duration_seconds: duration,
        outcome: inferred,
        summary,
      })
      res.json(result.data ?? result)
    } catch (error) {
      logger.error('calls.end', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
