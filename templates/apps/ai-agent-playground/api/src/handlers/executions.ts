/**
 * Executions handler — access to historical agent runs and the per-step
 * trace timeline. Individual runs are immutable; the only write operation
 * is `DELETE /` which clears the caller's entire run history (used by the
 * Settings "Purge Workspace" danger-zone action).
 *
 * Uses the abstract DataStore (`@molecule/api-database`) for persistence.
 * Ownership is enforced — non-owner reads return 404, never 403, to avoid
 * leaking existence (per INVENTORY's authorization rules).
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import { deleteMany, findById, findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const getParamAgentId = (req: Request): string => {
  const id = req.params.agentId
  return Array.isArray(id) ? id[0] : id
}

const agentIdParamSchema = z.object({ agentId: z.string().min(1) })

const listQuerySchema = z.object({
  agent_id: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

interface ExecutionRow {
  id: string
  user_id: string
  agent_id: string
  status?: string
  input?: string
  output?: string
  tool_calls?: unknown
  model?: string
  provider?: string
  duration_ms?: number
  token_count?: number
  started_at?: Date | string
  finished_at?: Date | string
  error_message?: string | null
}

interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
  output?: unknown
  started_at?: string
  finished_at?: string
  error?: string
}

interface TimelineEvent {
  id: string
  type: 'start' | 'tool_call' | 'tool_result' | 'finish' | 'error'
  label: string
  timestamp: string
  durationMs?: number
  metadata?: Record<string, unknown>
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    const query = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (query.agent_id) {
      where.push({ field: 'agent_id', operator: '=', value: query.agent_id })
    }
    const executions = await findMany<ExecutionRow>('agent_executions', {
      where,
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit: query.limit ?? 50,
    })
    res.json(executions)
  } catch (err) {
    logger.error('executions.list failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
      return
    }
    await deleteMany('agent_executions', [{ field: 'user_id', operator: '=', value: userId }])
    res.status(204).end()
  } catch (err) {
    logger.error('executions.deleteAll failed', err)
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
    const execution = await findById<ExecutionRow>('agent_executions', id)
    if (!execution || execution.user_id !== userId) {
      res.status(404).json({
        error: t('executions.notFound', undefined, { defaultValue: 'Execution not found' }),
      })
      return
    }
    const timeline = buildTimelineEvents(execution as unknown as Record<string, unknown>)
    res.json({ ...execution, timeline })
  } catch (err) {
    logger.error('executions.get failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/agent/:agentId',
  validateParams(agentIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
        return
      }
      const agentId = getParamAgentId(req)
      const where: WhereCondition[] = [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'agent_id', operator: '=', value: agentId },
      ]
      const executions = await findMany<ExecutionRow>('agent_executions', {
        where,
        orderBy: [{ field: 'started_at', direction: 'desc' }],
        limit: 100,
      })
      res.json(executions)
    } catch (err) {
      logger.error('executions.listByAgent failed', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

function buildTimelineEvents(execution: Record<string, unknown>): TimelineEvent[] {
  const events: TimelineEvent[] = []
  events.push({
    id: 'start',
    type: 'start',
    label: t('executions.timeline.started', undefined, { defaultValue: 'Execution started' }),
    timestamp: String(execution.started_at),
    metadata: { model: execution.model, provider: execution.provider },
  })

  const rawToolCalls = execution.tool_calls
  const toolCalls = Array.isArray(rawToolCalls) ? (rawToolCalls as ToolCall[]) : []
  for (const call of toolCalls) {
    events.push({
      id: `tool-${call.id}-call`,
      type: 'tool_call',
      label: t(
        'executions.timeline.toolCall',
        { name: call.name },
        { defaultValue: `Tool: ${call.name}` },
      ),
      timestamp: call.started_at || String(execution.started_at),
      metadata: { toolName: call.name, input: call.input },
    })
    if (call.output !== undefined || call.error) {
      events.push({
        id: `tool-${call.id}-result`,
        type: call.error ? 'error' : 'tool_result',
        label: call.error
          ? t(
              'executions.timeline.toolError',
              { name: call.name },
              { defaultValue: `Error in ${call.name}` },
            )
          : t(
              'executions.timeline.toolResult',
              { name: call.name },
              { defaultValue: `Result: ${call.name}` },
            ),
        timestamp: call.finished_at || String(execution.started_at),
        metadata: { output: call.output, error: call.error },
      })
    }
  }

  events.push({
    id: 'finish',
    type: execution.status === 'failed' ? 'error' : 'finish',
    label:
      execution.status === 'failed'
        ? t('executions.timeline.failed', undefined, { defaultValue: 'Execution failed' })
        : t('executions.timeline.completed', undefined, { defaultValue: 'Execution completed' }),
    timestamp: String(execution.finished_at ?? execution.started_at),
    durationMs: Number(execution.duration_ms ?? 0),
    metadata: { tokenCount: execution.token_count },
  })

  return events
}

export default router
