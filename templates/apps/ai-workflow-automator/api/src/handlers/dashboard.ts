/**
 * Dashboard summary — aggregates the user's workflows + recent run history
 * into the KPIs the Dashboard page needs in a single round-trip.
 *
 * Surface area is read-only and intentionally narrow: the page renders KPI
 * cards, a hero sparkline (24h hourly run counts), the 3 most recently-run
 * workflows, and the 6 most recent runs across the workspace.
 */
import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

router.use(authorizers.auth())

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const workflows = await findMany<Record<string, unknown>>('workflows', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    const workflowIds = workflows.map((w) => String(w.id))
    const workflowMap: Record<string, Record<string, unknown>> = {}
    for (const w of workflows) workflowMap[w.id as string] = w

    const runs =
      workflowIds.length === 0
        ? []
        : await findMany<Record<string, unknown>>('workflow_runs', {
            where: [{ field: 'workflow_id', operator: 'in', value: workflowIds }],
            orderBy: [{ field: 'started_at', direction: 'desc' }],
            limit: 200,
          })

    const now = Date.now()
    const dayMs = 24 * 3600 * 1000
    const last24 = runs.filter((r) => {
      const t = r.started_at ? new Date(String(r.started_at)).getTime() : 0
      return now - t <= dayMs
    })

    const succeeded24 = last24.filter(
      (r) => r.status === 'success' || r.status === 'completed',
    ).length
    const failed24 = last24.filter((r) => r.status === 'failure' || r.status === 'failed').length
    const finished24 = succeeded24 + failed24
    const successRate = finished24 > 0 ? Math.round((succeeded24 / finished24) * 1000) / 10 : null
    const active = workflows.filter((w) => Boolean(w.enabled)).length

    // 24h hourly sparkline (oldest-first 24 buckets)
    const sparkline = Array<number>(24).fill(0)
    for (const r of last24) {
      const t = r.started_at ? new Date(String(r.started_at)).getTime() : 0
      if (!t) continue
      const hoursAgo = Math.min(23, Math.floor((now - t) / 3600000))
      const idx = 23 - hoursAgo
      if (idx >= 0 && idx < 24) sparkline[idx]++
    }

    const durations = last24
      .filter((r) => r.started_at && r.finished_at)
      .map((r) => {
        const a = new Date(String(r.started_at)).getTime()
        const b = new Date(String(r.finished_at)).getTime()
        return b - a
      })
      .filter((d) => d >= 0)
      .sort((a, b) => a - b)
    const median = durations.length ? durations[Math.floor(durations.length / 2)] : null
    const p95 = durations.length
      ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.95))]
      : null
    const queueDepth = runs.filter((r) => r.status === 'queued').length
    const activeRuns = runs.filter((r) => r.status === 'running').length

    const recentRuns = runs.slice(0, 6).map((r) => ({
      id: r.id as string,
      workflow_id: r.workflow_id as string,
      workflow_name: (workflowMap[r.workflow_id as string]?.name as string) ?? 'workflow',
      trigger_source: (r.trigger_source as string) ?? 'manual',
      status: (r.status as string) ?? 'queued',
      started_at: (r.started_at as string) ?? null,
      finished_at: (r.finished_at as string) ?? null,
    }))

    const recentWorkflows = workflows.slice(0, 3).map((w) => {
      const wfRuns = runs.filter((r) => r.workflow_id === w.id)
      const wfFinished = wfRuns.filter(
        (r) =>
          r.status === 'success' ||
          r.status === 'failure' ||
          r.status === 'completed' ||
          r.status === 'failed',
      )
      const wfSucceeded = wfFinished.filter(
        (r) => r.status === 'success' || r.status === 'completed',
      ).length
      return {
        id: w.id as string,
        name: w.name as string,
        trigger_type: (w.trigger_type as string) ?? 'manual',
        run_count: (w.run_count as number) ?? 0,
        success_rate:
          wfFinished.length > 0 ? Math.round((wfSucceeded / wfFinished.length) * 1000) / 10 : null,
        last_run_at: (w.last_run_at as string) ?? null,
        recent_runs: wfRuns
          .slice(0, 12)
          .map((r) => (r.status === 'success' || r.status === 'completed' ? 1 : 0)),
      }
    })

    res.json({
      runs_today: last24.length,
      success_rate: successRate,
      failed_24h: failed24,
      median_duration_ms: median,
      p95_duration_ms: p95,
      queue_depth: queueDepth,
      active_runs: activeRuns,
      active_workflows: active,
      total_workflows: workflows.length,
      sparkline,
      recent_runs: recentRuns,
      recent_workflows: recentWorkflows,
    })
  } catch (error) {
    logger.error('dashboard.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
