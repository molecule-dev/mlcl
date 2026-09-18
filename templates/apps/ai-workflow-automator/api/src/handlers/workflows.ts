import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { hasProvider as hasAi, requireProvider as requireAi } from '@molecule/api-ai'
import { cancel, schedule } from '@molecule/api-cron'
import {
  count,
  create,
  deleteById,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireWorkflowOwnership } from '../lib/authz.js'
import { safeFetch } from '../lib/safe-fetch.js'
import type { AiWorkflowAutomatorLimits } from '../tiers.js'

const router = Router()

/**
 * In-memory map of workflow id → scheduled cron JOB id. `schedule()` returns
 * a provider-generated job id (NOT the name passed in), and `cancel()` only
 * accepts that id — cancelling by name throws "Cron job not found", which
 * made disabling an enabled schedule 500 and left the cron firing forever.
 * The cron registry itself is in-process (jobs do not survive an api
 * restart), so this map's lifetime matches it exactly.
 */
const scheduledJobIds = new Map<string, string>()

/**
 * Cancels a workflow's scheduled cron job, if one is registered in this
 * process. Safe after a restart (registry and map are both empty) and safe
 * to call for never-scheduled workflows.
 */
async function cancelWorkflowSchedule(workflowId: string): Promise<void> {
  const jobId = scheduledJobIds.get(workflowId)
  if (!jobId) return
  scheduledJobIds.delete(workflowId)
  try {
    await cancel(jobId)
  } catch (error) {
    // The job may already be gone (stopped after a handler failure) — the
    // workflow is still correctly disabled, so degrade to a warning.
    logger.warn('workflows: failed to cancel scheduled cron job', { error, workflowId, jobId })
  }
}

/**
 * A workflow fires on a recurring cron schedule when its trigger_type is either
 * 'schedule' or 'cron'. The two are synonyms (both are validated + carry a
 * cron_expression, and the UI labels 'cron' with the schedule icon), but only
 * 'schedule' was being armed — so a workflow created as 'cron' never ran.
 */
function isScheduledTrigger(triggerType: unknown): boolean {
  return triggerType === 'schedule' || triggerType === 'cron'
}

const stepSchema = z.object({
  type: z.string().min(1).max(64),
  config: z.record(z.string(), z.unknown()).optional().default({}),
})

const createWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  trigger_type: z.enum(['manual', 'webhook', 'cron', 'schedule']),
  cron_expression: z.string().max(200).nullable().optional(),
  condition_prompt: z.string().max(10000).optional().default(''),
  steps: z.array(stepSchema).optional().default([]),
})

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  trigger_type: z.enum(['manual', 'webhook', 'cron', 'schedule']).optional(),
  cron_expression: z.string().max(200).nullable().optional(),
  condition_prompt: z.string().max(10000).optional(),
  steps: z.array(stepSchema).optional(),
})

router.use(authorizers.auth())

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const workflows = await findMany<Record<string, unknown>>('workflows', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const enriched = await Promise.all(
      workflows.map(async (wf) => {
        const lastRunRows = await findMany<Record<string, unknown>>('workflow_runs', {
          where: [{ field: 'workflow_id', operator: '=', value: wf.id as string }],
          orderBy: [{ field: 'started_at', direction: 'desc' }],
          limit: 1,
        })
        return { ...wf, last_run: lastRunRows[0] ?? null }
      }),
    )

    res.json(enriched)
  } catch (error) {
    logger.error('workflows.list', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const wfCheck = await requireWorkflowOwnership(req.params.id as string, userId)
    if (!wfCheck.ok) {
      res.status(wfCheck.status).json({
        error: t('workflows.notFound', {}, { defaultValue: 'Workflow not found' }),
      })
      return
    }
    const steps = await findMany<Record<string, unknown>>('workflow_steps', {
      where: [{ field: 'workflow_id', operator: '=', value: req.params.id as string }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...wfCheck.row, steps })
  } catch (error) {
    logger.error('workflows.get', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<AiWorkflowAutomatorLimits>({
    limitType: 'maxWorkflows',
    getLimit: (limits) => limits.maxWorkflows,
    getCurrent: async (userId) =>
      count('workflows', [{ field: 'user_id', operator: '=', value: userId }] as WhereCondition[]),
  }) as unknown as RequestHandler,
  validateBody(createWorkflowSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const { name, description, trigger_type, cron_expression, condition_prompt, steps } =
        req.body as z.infer<typeof createWorkflowSchema>

      const result = await create<Record<string, unknown>>('workflows', {
        user_id: userId,
        name,
        description,
        trigger_type,
        cron_expression: cron_expression ?? null,
        condition_prompt,
        enabled: false,
        run_count: 0,
        success_count: 0,
        failure_count: 0,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const workflow = result.data
      if (workflow && Array.isArray(steps)) {
        for (let i = 0; i < steps.length; i++) {
          await create('workflow_steps', {
            workflow_id: workflow.id,
            position: i,
            type: steps[i].type,
            config: JSON.stringify(steps[i].config ?? {}),
            created_at: new Date().toISOString(),
          })
        }
      }

      res.status(201).json(workflow)
    } catch (error) {
      logger.error('workflows.create', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateWorkflowSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const wfCheck = await requireWorkflowOwnership(req.params.id as string, userId)
    if (!wfCheck.ok) {
      res.status(wfCheck.status).json({
        error: t('workflows.notFound', {}, { defaultValue: 'Workflow not found' }),
      })
      return
    }

    const body = req.body as z.infer<typeof updateWorkflowSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.trigger_type !== undefined) updates.trigger_type = body.trigger_type
    if (body.cron_expression !== undefined) updates.cron_expression = body.cron_expression
    if (body.condition_prompt !== undefined) updates.condition_prompt = body.condition_prompt

    const result = await updateById<Record<string, unknown>>(
      'workflows',
      req.params.id as string,
      updates,
    )

    if (Array.isArray(body.steps)) {
      const existing = await findMany<Record<string, unknown>>('workflow_steps', {
        where: [{ field: 'workflow_id', operator: '=', value: req.params.id as string }],
      })
      for (const step of existing) {
        await deleteById('workflow_steps', step.id as string)
      }
      for (let i = 0; i < body.steps.length; i++) {
        await create('workflow_steps', {
          workflow_id: req.params.id as string,
          position: i,
          type: body.steps[i].type,
          config: JSON.stringify(body.steps[i].config ?? {}),
          created_at: new Date().toISOString(),
        })
      }
    }

    // Re-arm the schedule when its definition changed while ENABLED: the
    // in-process cron job keeps firing the OLD cron_expression (or keeps
    // firing at all after a trigger_type change away from 'schedule')
    // otherwise — editing a live schedule silently never took effect.
    // Runs AFTER the steps swap above so a re-registered job can never fire
    // against a half-replaced step list.
    const wf = wfCheck.row as Record<string, unknown>
    if (wf.enabled) {
      const workflowId = req.params.id as string
      const nextTriggerType = (body.trigger_type ?? wf.trigger_type) as string
      const nextCron = (
        body.cron_expression !== undefined ? body.cron_expression : wf.cron_expression
      ) as string | null
      const scheduleChanged = nextTriggerType !== wf.trigger_type || nextCron !== wf.cron_expression
      if (scheduleChanged) {
        await cancelWorkflowSchedule(workflowId)
        if (isScheduledTrigger(nextTriggerType) && nextCron) {
          // Keep the RETURNED job id — cancel() takes the id, not the name.
          const jobId = await schedule(`workflow-${workflowId}`, nextCron, async () => {
            await triggerWorkflowRun(workflowId, 'schedule')
          })
          scheduledJobIds.set(workflowId, jobId)
        }
      }
    }

    res.json(result.data)
  } catch (error) {
    logger.error('workflows.update', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const wfCheck = await requireWorkflowOwnership(req.params.id as string, userId)
    if (!wfCheck.ok) {
      res.status(wfCheck.status).json({
        error: t('workflows.notFound', {}, { defaultValue: 'Workflow not found' }),
      })
      return
    }
    const wf = wfCheck.row as Record<string, unknown>
    const nowEnabled = !wf.enabled

    await updateById('workflows', req.params.id as string, {
      enabled: nowEnabled,
      updated_at: new Date().toISOString(),
    })

    if (isScheduledTrigger(wf.trigger_type) && wf.cron_expression) {
      const workflowId = req.params.id as string
      if (nowEnabled) {
        // Keep the RETURNED job id — cancel() takes the id, not the name.
        const jobId = await schedule(
          `workflow-${workflowId}`,
          wf.cron_expression as string,
          async () => {
            await triggerWorkflowRun(workflowId, 'schedule')
          },
        )
        scheduledJobIds.set(workflowId, jobId)
      } else {
        await cancelWorkflowSchedule(workflowId)
      }
    }

    res.json({ id: req.params.id, enabled: nowEnabled })
  } catch (error) {
    logger.error('workflows.toggle', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/trigger', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const wfCheck = await requireWorkflowOwnership(req.params.id as string, userId)
    if (!wfCheck.ok) {
      res.status(wfCheck.status).json({
        error: t('workflows.notFound', {}, { defaultValue: 'Workflow not found' }),
      })
      return
    }
    const run = await triggerWorkflowRun(req.params.id as string, 'manual')
    res.status(202).json(run)
  } catch (error) {
    logger.error('workflows.trigger', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const wfCheck = await requireWorkflowOwnership(req.params.id as string, userId)
    if (!wfCheck.ok) {
      res.status(wfCheck.status).json({
        error: t('workflows.notFound', {}, { defaultValue: 'Workflow not found' }),
      })
      return
    }
    const wf = wfCheck.row as Record<string, unknown>
    if (isScheduledTrigger(wf.trigger_type)) {
      await cancelWorkflowSchedule(req.params.id as string)
    }
    await deleteById('workflows', req.params.id as string)
    res.status(204).end()
  } catch (error) {
    logger.error('workflows.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function triggerWorkflowRun(
  workflowId: string,
  triggerSource: string,
): Promise<Record<string, unknown>> {
  const workflowRows = await findMany<Record<string, unknown>>('workflows', {
    where: [{ field: 'id', operator: '=', value: workflowId }],
    limit: 1,
  })
  const workflow = workflowRows[0]
  if (!workflow) {
    throw new Error('workflow not found')
  }

  const runResult = await create<Record<string, unknown>>('workflow_runs', {
    workflow_id: workflowId,
    trigger_source: triggerSource,
    status: 'running',
    started_at: new Date().toISOString(),
    step_results: '[]',
  })
  const run = runResult.data
  if (!run) {
    throw new Error('failed to create workflow run')
  }

  // AI condition gate: bond may be missing/unkeyed in test mode → default-pass.
  if (workflow.condition_prompt) {
    let passed = true
    let reason = ''
    try {
      const text = await runAiPrompt(
        'You are a workflow condition evaluator. Respond only with JSON: { "pass": true|false, "reason": "..." }',
        String(workflow.condition_prompt),
      )
      const parsed = JSON.parse(text) as { pass?: boolean; reason?: string }
      passed = parsed.pass !== false
      reason = parsed.reason ?? ''
    } catch (_error) {
      // bond unavailable / parse failure → default pass; condition is advisory.
    }

    if (!passed) {
      await updateById('workflow_runs', run.id as string, {
        status: 'skipped',
        finished_at: new Date().toISOString(),
        step_results: JSON.stringify([{ type: 'condition', result: 'skipped', reason }]),
      })
      await updateById('workflows', workflowId, {
        run_count: ((workflow.run_count as number) ?? 0) + 1,
      })
      return { ...run, status: 'skipped' }
    }
  }

  const steps = await findMany<Record<string, unknown>>('workflow_steps', {
    where: [{ field: 'workflow_id', operator: '=', value: workflowId }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })

  const stepResults: Record<string, unknown>[] = []
  let overallStatus = 'success'

  for (const step of steps) {
    const stepType = String(step.type)
    try {
      const output = await runStep(stepType, String(step.config ?? '{}'))
      stepResults.push({ step_id: step.id, type: stepType, status: 'success', output })
    } catch (err) {
      overallStatus = 'failure'
      stepResults.push({
        step_id: step.id,
        type: stepType,
        status: 'failure',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  await updateById('workflow_runs', run.id as string, {
    status: overallStatus,
    finished_at: new Date().toISOString(),
    step_results: JSON.stringify(stepResults),
  })

  const successDelta = overallStatus === 'success' ? 1 : 0
  const failureDelta = overallStatus === 'failure' ? 1 : 0
  await updateById('workflows', workflowId, {
    run_count: ((workflow.run_count as number) ?? 0) + 1,
    success_count: ((workflow.success_count as number) ?? 0) + successDelta,
    failure_count: ((workflow.failure_count as number) ?? 0) + failureDelta,
    last_run_at: new Date().toISOString(),
  })

  return { ...run, status: overallStatus, step_results: stepResults }
}

/**
 * Execute a single workflow step. v1 ships three step kinds:
 *
 *  - `http`  — POST a JSON body to a user-supplied URL via the standard
 *              `fetch` API.
 *  - `ai`    — Run a prompt through the bonded `@molecule/api-ai`
 *              provider (Anthropic Claude in v1).
 *  - `email` — Send an email via the bonded `@molecule/api-emails`
 *              provider (Mailgun in v1).
 *
 * Slack/Notion/Gmail/GSheets etc. are deferred to Phase 3 with new
 * `@molecule/api-channel-*` and `@molecule/api-integration-*` bonds.
 */
async function runStep(stepType: string, configJson: string): Promise<string> {
  let config: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(configJson)
    if (parsed && typeof parsed === 'object') {
      config = parsed as Record<string, unknown>
    }
  } catch (_error) {
    // empty/invalid config is allowed; downstream defaults apply.
  }

  switch (stepType) {
    case 'http': {
      const url = String(config.url ?? '')
      if (!url) throw new Error('http step requires "url"')
      const method = String(config.method ?? 'POST').toUpperCase()
      const headers = (config.headers as Record<string, string> | undefined) ?? {
        'content-type': 'application/json',
      }
      const body = method === 'GET' ? undefined : JSON.stringify(config.body ?? {})
      // SSRF guard: `safeFetch` pins the connection away from internal services
      // (Postgres/Redis/sandbox host) and the cloud metadata endpoint
      // (169.254.169.254) by validating the IP INSIDE undici's connect-time DNS
      // lookup — the same resolution used to open the socket — so a low-TTL
      // rebinding host cannot slip an internal IP through a validate-then-fetch
      // window. It also rejects non-http(s) URLs and won't auto-follow a 3xx
      // (`redirect: 'manual'`) so a redirect can't rebind to an internal host.
      // On block it throws and never connects; the caller records the step failure.
      let r: Awaited<ReturnType<typeof safeFetch>>
      try {
        r = await safeFetch(url, { method, headers, body })
      } catch (guardError) {
        const reason = guardError instanceof Error ? guardError.message : String(guardError)
        throw new Error(
          t(
            'workflows.http.blockedUrl',
            { reason },
            { defaultValue: 'http step URL blocked: {{reason}}' },
          ),
          { cause: guardError },
        )
      }
      const text = await r.text()
      if (!r.ok) {
        throw new Error(`http ${r.status}: ${text.slice(0, 200)}`)
      }
      return text.slice(0, 4000)
    }
    case 'ai': {
      const prompt = String(config.prompt ?? '')
      if (!prompt) throw new Error('ai step requires "prompt"')
      return runAiPrompt(
        String(config.system ?? 'You are a workflow step. Reply concisely.'),
        prompt,
      )
    }
    case 'email': {
      const to = String(config.to ?? '')
      const subject = String(config.subject ?? '')
      const body = String(config.body ?? '')
      if (!to || !subject) throw new Error('email step requires "to" and "subject"')
      // Use the bonded emails provider via a dynamic import so missing-bond
      // failures surface as step errors, not module-load errors. The core
      // `@molecule/api-emails` package exposes `sendMail` (matching the
      // shared EmailTransport interface) — not `sendEmail`.
      const emails = (await import('@molecule/api-emails')) as {
        sendMail?: (m: {
          to: string | string[]
          subject: string
          html?: string
          text?: string
          from?: string
        }) => Promise<unknown>
      }
      if (!emails.sendMail) throw new Error('email bond missing sendMail')
      const fromAddress = process.env.MAILGUN_DOMAIN
        ? `automation@${process.env.MAILGUN_DOMAIN}`
        : 'automation@example.com'
      await emails.sendMail({ to, subject, text: body, from: fromAddress })
      return `email queued for ${to}`
    }
    default:
      throw new Error(`unknown step type: ${stepType}`)
  }
}

/**
 * Stream a single-turn user message through the bonded AI provider and
 * return the concatenated text. Throws if no provider is bonded — the
 * caller catches and records the failure on the run row.
 */
async function runAiPrompt(system: string, prompt: string): Promise<string> {
  if (!hasAi()) {
    throw new Error('ai bond not configured (set ANTHROPIC_API_KEY or another provider)')
  }
  const provider = requireAi()
  const stream = provider.chat({
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  let text = ''
  for await (const event of stream) {
    if (event.type === 'text') text += event.content
  }
  return text
}

export default router
