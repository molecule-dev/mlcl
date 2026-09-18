/**
 * Notifications — synthesised activity feed derived from the user's
 * workflow run history. Each failed run becomes an `failed` notification;
 * recent success / queued / paused runs become matching activity entries.
 *
 * The app does not have a dedicated notifications table; we render a
 * server-derived feed on demand so the UI shows real, observable rows on
 * a fresh install.
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
    const userWorkflows = await findMany<Record<string, unknown>>('workflows', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    if (userWorkflows.length === 0) {
      res.json({ data: [], total: 0, unread: 0 })
      return
    }
    const workflowIds = userWorkflows.map((wf) => String(wf.id))
    const workflowMap: Record<string, string> = {}
    for (const wf of userWorkflows) {
      workflowMap[wf.id as string] = wf.name as string
    }

    const recent = await findMany<Record<string, unknown>>('workflow_runs', {
      where: [{ field: 'workflow_id', operator: 'in', value: workflowIds }],
      orderBy: [{ field: 'started_at', direction: 'desc' }],
      limit: 50,
    })

    const now = Date.now()
    const items = recent.map((r, i) => {
      const status = String(r.status ?? 'queued')
      const startedAtRaw = String(r.started_at ?? '')
      const startedMs = startedAtRaw ? new Date(startedAtRaw).getTime() : now
      const ageMs = Math.max(0, now - startedMs)
      const wfName = workflowMap[r.workflow_id as string] ?? 'workflow'
      const group =
        ageMs < 24 * 3600 * 1000 ? 'Today' : ageMs < 48 * 3600 * 1000 ? 'Yesterday' : 'This week'
      const title =
        status === 'failure' || status === 'failed'
          ? `${wfName} failed`
          : status === 'success' || status === 'completed'
            ? `${wfName} completed`
            : status === 'paused'
              ? `${wfName} paused`
              : status === 'queued'
                ? `${wfName} queued`
                : `${wfName} ${status}`
      const body =
        status === 'failure' || status === 'failed'
          ? 'Run finished with errors. Open the run to inspect step output.'
          : 'Run logged. Open the run to see step-by-step output.'
      return {
        id: `run:${r.id as string}`,
        kind: 'run',
        run_id: r.id as string,
        workflow_id: r.workflow_id as string,
        workflow_name: wfName,
        status,
        title,
        body,
        group,
        time: startedAtRaw,
        unread: i < 3 && (status === 'failure' || status === 'failed'),
      }
    })

    res.json({
      data: items,
      total: items.length,
      unread: items.filter((i) => i.unread).length,
    })
  } catch (error) {
    logger.error('notifications.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
