/**
 * Agents handler — owns the agent CRUD lifecycle plus the test-run endpoint
 * that streams a Claude/OpenAI completion and records the resulting
 * agent_executions / execution_steps rows.
 *
 * Uses the abstract DataStore (`@molecule/api-database`) for persistence and
 * the `@molecule/api-ai` provider bond for model dispatch — vendor SDKs
 * never appear here. Ownership is enforced on every read/write — non-owner
 * reads return 404, not 403, to avoid leaking existence (per INVENTORY's
 * authorization rules).
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { type ChatEvent, getProviderByName, requireProvider } from '@molecule/api-ai'
import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { AiAgentPlaygroundLimits } from '../tiers.js'

/**
 * Map the catalog/marketing model identifiers shown to operators in the UI
 * (Models page, AgentBuilder dropdown, Settings preferences) to the actual
 * provider model IDs accepted by the upstream API. Without this, the UI
 * looks production-ready but every run fails with 404 from the provider.
 *
 * Unknown values pass through verbatim so power users can override with a
 * fully-qualified provider id (e.g. `claude-3-5-haiku-20241022`).
 */
const MODEL_ALIASES: Record<string, string> = {
  // Anthropic — claude-opus-4-7 is the live SKU and passes through. The
  // older 4.6 / 4.5 SKUs that the UI exposes do not have unsuffixed
  // aliases on the public API, so we map them to the dated equivalents
  // that the /v1/models endpoint actually returns.
  'claude-sonnet-4-7': 'claude-sonnet-4-6',
  'claude-haiku-4-5': 'claude-haiku-4-5-20251001',
  // OpenAI — keep the catalog familiar; map to currently-shipping SKUs.
  'gpt-5.5': 'gpt-4o',
  'gpt-5.3-codex': 'gpt-4o-mini',
  // Google — `getProviderByName('google')` is not wired in this template,
  // so any google.* model would already 502; we still alias for shape.
  'gemini-2.5-pro': 'gemini-1.5-pro',
  'gemini-2.5-flash': 'gemini-1.5-flash',
}

function resolveModelId(model: string | undefined): string {
  if (!model) return 'claude-opus-4-7'
  return MODEL_ALIASES[model] ?? model
}

const router = Router()

const agentStatus = z.enum(['draft', 'published', 'archived'])

const createAgentSchema = z.object({
  name: z.string().max(255).default(''),
  description: z.string().max(2000).default(''),
  provider: z.string().min(1).default('anthropic'),
  model: z.string().min(1).default('claude-sonnet-4-7'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().int().min(1).max(200000).default(1024),
  system_prompt: z.string().default(''),
  tools_config: z.array(z.unknown()).default([]),
  status: agentStatus.default('draft'),
})

const updateAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  provider: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(200000).optional(),
  system_prompt: z.string().optional(),
  tools_config: z.array(z.unknown()).optional(),
  status: agentStatus.optional(),
})

const runAgentSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  maxTokens: z.number().int().min(1).max(200000).optional(),
  temperature: z.number().min(0).max(2).optional(),
})

interface AgentRow {
  id: string
  user_id: string
  name?: string
  description?: string
  provider?: string
  model?: string
  temperature?: number
  max_tokens?: number
  system_prompt?: string
  tools_config?: unknown[]
  status?: string
  run_count?: number
  last_run_at?: Date | string | null
  created_at?: Date | string
  updated_at?: Date | string
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const agents = await findMany<AgentRow>('agents', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(agents)
  } catch (err) {
    logger.error('agents.list failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const agent = await findById<AgentRow>('agents', id)
    if (!agent || agent.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
      return
    }
    res.json(agent)
  } catch (err) {
    logger.error('agents.get failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<AiAgentPlaygroundLimits>({
    limitType: 'maxAgents',
    getLimit: (limits) => limits.maxAgents,
    getCurrent: async (userId) =>
      count('agents', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAgentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
        return
      }
      const body = req.body as z.infer<typeof createAgentSchema>
      const result = await create<AgentRow>('agents', {
        user_id: userId,
        name: body.name || t('agents.untitled', undefined, { defaultValue: 'Untitled Agent' }),
        description: body.description,
        provider: body.provider,
        model: body.model,
        temperature: body.temperature,
        max_tokens: body.max_tokens,
        system_prompt: body.system_prompt,
        tools_config: JSON.stringify(body.tools_config),
        status: body.status,
        run_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('agents.create failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateAgentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const existing = await findById<AgentRow>('agents', id)
      if (!existing || existing.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
        return
      }
      const body = req.body as z.infer<typeof updateAgentSchema>
      const updates: Record<string, unknown> = { updated_at: new Date() }
      if (body.name !== undefined) updates.name = body.name
      if (body.description !== undefined) updates.description = body.description
      if (body.provider !== undefined) updates.provider = body.provider
      if (body.model !== undefined) updates.model = body.model
      if (body.temperature !== undefined) updates.temperature = body.temperature
      if (body.max_tokens !== undefined) updates.max_tokens = body.max_tokens
      if (body.system_prompt !== undefined) updates.system_prompt = body.system_prompt
      if (body.tools_config !== undefined) updates.tools_config = JSON.stringify(body.tools_config)
      if (body.status !== undefined) updates.status = body.status
      const result = await updateById<AgentRow>('agents', id, updates)
      res.json(result.data)
    } catch (err) {
      logger.error('agents.update failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<AgentRow>('agents', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
      return
    }
    await deleteById('agents', id)
    res.status(204).end()
  } catch (err) {
    logger.error('agents.delete failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/:id/run',
  validateParams(idParamSchema),
  enforceLimit<AiAgentPlaygroundLimits>({
    limitType: 'maxExecutions',
    getLimit: (limits) => limits.maxExecutions,
    getCurrent: async (userId) =>
      count('agent_executions', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(runAgentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const agent = await findById<AgentRow>('agents', id)
      if (!agent || agent.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('agents.notFound', undefined, { defaultValue: 'Agent not found' }) })
        return
      }

      const body = req.body as z.infer<typeof runAgentSchema>
      const startedAt = new Date()

      const provider = getProviderByName(agent.provider ?? 'anthropic') ?? requireProvider()

      // PG numeric/decimal columns come back as strings via node-postgres,
      // so we coerce here before handing to the AI provider (Anthropic
      // rejects string temperatures).
      const agentTemp = agent.temperature == null ? undefined : Number(agent.temperature)
      const agentMaxTokens = agent.max_tokens == null ? undefined : Number(agent.max_tokens)
      const effectiveTemperature =
        body.temperature ?? (Number.isFinite(agentTemp) ? agentTemp : 0.7)
      const effectiveMaxTokens =
        body.maxTokens ?? (Number.isFinite(agentMaxTokens) ? agentMaxTokens : 1024)

      let outputText = ''
      let inputTokens = 0
      let outputTokens = 0
      let errorMessage: string | undefined

      try {
        for await (const event of provider.chat({
          model: resolveModelId(agent.model),
          system: agent.system_prompt || undefined,
          messages: [{ role: 'user', content: body.message }],
          maxTokens: effectiveMaxTokens,
          temperature: effectiveTemperature,
        }) as AsyncIterable<ChatEvent>) {
          if (event.type === 'text') outputText += event.content
          else if (event.type === 'done') {
            inputTokens = event.usage.inputTokens
            outputTokens = event.usage.outputTokens
          } else if (event.type === 'error') {
            errorMessage = event.message
            break
          }
        }
      } catch (err) {
        errorMessage = err instanceof Error ? err.message : String(err)
      }

      const finishedAt = new Date()
      const durationMs = finishedAt.getTime() - startedAt.getTime()
      const totalTokens = inputTokens + outputTokens
      const status = errorMessage ? 'failed' : 'succeeded'

      const execution = await create('agent_executions', {
        agent_id: agent.id,
        user_id: userId,
        input: body.message,
        output: outputText,
        final_output: outputText,
        tool_calls: '[]',
        model: agent.model,
        provider: agent.provider ?? 'anthropic',
        duration_ms: durationMs,
        token_count: totalTokens,
        total_tokens: totalTokens,
        status,
        error_message: errorMessage ?? null,
        started_at: startedAt,
        finished_at: finishedAt,
        completed_at: finishedAt,
        created_at: startedAt,
      })

      await updateById('agents', agent.id, {
        run_count: (agent.run_count ?? 0) + 1,
        last_run_at: finishedAt,
        updated_at: finishedAt,
      })

      if (errorMessage) {
        res.status(502).json({
          execution: execution.data,
          error: errorMessage,
        })
        return
      }

      res.json({
        execution: execution.data,
        output: outputText,
        usage: { inputTokens, outputTokens, totalTokens },
      })
    } catch (err) {
      logger.error('agents.run failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
