import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findMany, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireWorkflowOwnership, requireWorkflowRunOwnership } from '../lib/authz.js'

const router = Router()

const listRunsQuerySchema = z.object({
  workflow_id: z.string().min(1).max(64).optional(),
  status: z.enum(['queued', 'running', 'success', 'failure', 'skipped', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

router.use(authorizers.auth())

// List run history across all workflows for the current user.
router.get('/', validateQuery(listRunsQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { workflow_id, status, limit } = req.query as {
      workflow_id?: string
      status?: string
      limit?: string
    }

    const userWorkflows = await findMany<Record<string, unknown>>('workflows', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })

    const workflowIds = userWorkflows.map((wf) => String(wf.id))
    if (workflowIds.length === 0) {
      res.json([])
      return
    }

    const where: WhereCondition[] = [{ field: 'workflow_id', operator: 'in', value: workflowIds }]
    if (workflow_id) where.push({ field: 'workflow_id', operator: '=', value: workflow_id })
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const runs = await findMany<Record<string, unknown>>('workflow_runs', {
      where,
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit: Number(limit) || 50,
    })

    const workflowMap: Record<string, string> = {}
    for (const wf of userWorkflows) {
      workflowMap[wf.id as string] = wf.name as string
    }

    res.json(
      runs.map((r) => ({
        ...r,
        workflow_name: workflowMap[r.workflow_id as string] ?? '',
      })),
    )
  } catch (error) {
    logger.error('runs.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Get a single run with full step results — caller must own parent workflow.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const runCheck = await requireWorkflowRunOwnership(req.params.id as string, userId)
    if (!runCheck.ok) {
      res.status(runCheck.status).json({
        error: t('runs.notFound', {}, { defaultValue: 'Run not found' }),
      })
      return
    }
    const run = runCheck.row as Record<string, unknown>

    let stepResults: unknown[] = []
    try {
      stepResults = JSON.parse((run.step_results as string) ?? '[]')
    } catch (_error) {
      // Malformed step_results JSON; return empty array so the response is still valid.
      stepResults = []
    }

    const workflowRows = await findMany<Record<string, unknown>>('workflows', {
      where: [{ field: 'id', operator: '=', value: run.workflow_id as string }],
      limit: 1,
    })
    const workflow = workflowRows[0]

    res.json({
      ...run,
      step_results: stepResults,
      workflow_name: workflow?.name ?? '',
    })
  } catch (error) {
    logger.error('runs.get', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Get run statistics for a specific workflow.
router.get('/stats/:workflowId', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const wfCheck = await requireWorkflowOwnership(req.params.workflowId as string, userId)
    if (!wfCheck.ok) {
      res.status(wfCheck.status).json({
        error: t('workflows.notFound', {}, { defaultValue: 'Workflow not found' }),
      })
      return
    }

    const runs = await findMany<Record<string, unknown>>('workflow_runs', {
      where: [{ field: 'workflow_id', operator: '=', value: req.params.workflowId as string }],
      orderBy: [{ field: 'started_at', direction: 'desc' }],
    })

    const total = runs.length
    const succeeded = runs.filter((r) => r.status === 'success').length
    const failed = runs.filter((r) => r.status === 'failure').length
    const skipped = runs.filter((r) => r.status === 'skipped').length

    const durations = runs
      .filter((r) => r.started_at && r.finished_at)
      .map((r) => {
        const start = new Date(r.started_at as string).getTime()
        const end = new Date(r.finished_at as string).getTime()
        return end - start
      })

    const avgDurationMs =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null

    res.json({
      workflow_id: req.params.workflowId,
      total,
      succeeded,
      failed,
      skipped,
      avg_duration_ms: avgDurationMs,
      recent: runs.slice(0, 5),
    })
  } catch (error) {
    logger.error('runs.stats', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
