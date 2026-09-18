/**
 * Issues handler — grouped errors keyed by stack-trace fingerprint.
 *
 * The first GET /api/issues for a freshly-signed-up user populates demo
 * data so the dashboard, issues list, releases, alerts, notifications,
 * team and performance pages all have realistic rows to render. Other
 * handlers don't need their own seed call because the user always lands
 * on the dashboard (which calls /api/issues) before any other route.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const FREQUENCY_BINS = 20

/**
 * Deterministically synthesize a 20-bin frequency sparkline from an issue's
 * fingerprint + event_count + status. This avoids needing a separate
 * per-issue events-by-bucket query for every list render. Resolved issues
 * trail off; unresolved issues spike toward the right edge; the shape
 * varies per fingerprint so the rows look distinct.
 */
const synthesizeFrequency = (fingerprint: string, eventCount: number, status: string): number[] => {
  let h = 0
  for (let i = 0; i < fingerprint.length; i++) {
    h = (h * 31 + fingerprint.charCodeAt(i)) >>> 0
  }
  const peak = Math.max(1, Math.round(eventCount / 12))
  const bins: number[] = []
  for (let i = 0; i < FREQUENCY_BINS; i++) {
    const phase = (h >> (i % 16)) & 0xff
    const wobble = (phase / 255) * 0.6 + 0.7
    let bin: number
    if (status === 'resolved') {
      const tail = Math.max(0, 1 - i / FREQUENCY_BINS)
      bin = Math.round(peak * 0.5 * tail * wobble)
    } else if (status === 'ignored') {
      bin = Math.round(peak * 0.4 * wobble)
    } else {
      const ramp = Math.min(1, (i + 4) / FREQUENCY_BINS)
      bin = Math.round(peak * ramp * wobble)
    }
    bins.push(bin)
  }
  return bins
}

const projectIssueRow = (
  issue: Record<string, unknown>,
  assigneeNameById: Map<string, string> = new Map(),
): Record<string, unknown> => {
  const fingerprint = String(issue.fingerprint ?? '')
  // bigint columns (event_count, user_count) come back as strings from
  // node-postgres because JS Number can't represent the full bigint range.
  // The dashboard sums them with `+=`, which silently turns into string
  // concatenation when one operand is a string ("0" + "312" + "138" =>
  // "0312138"). Coerce here so consumers see numbers.
  const eventCount = Number(issue.event_count ?? 0)
  const userCount = Number(issue.user_count ?? 0)
  const status = String(issue.status ?? 'unresolved')
  const culprit =
    (issue.culprit as string | null | undefined) ??
    (issue.exception_type
      ? `${issue.exception_type}${issue.exception_value ? ': ' + issue.exception_value : ''}`
      : '')
  const assignedTo = issue.assigned_to ? String(issue.assigned_to) : null
  return {
    ...issue,
    event_count: eventCount,
    user_count: userCount,
    culprit,
    frequency: synthesizeFrequency(fingerprint, eventCount, status),
    assignee: assignedTo ? (assigneeNameById.get(assignedTo) ?? null) : null,
  }
}

const listQuerySchema = z.object({
  project_id: z.string().optional(),
  status: z.enum(['unresolved', 'resolved', 'ignored']).optional(),
  level: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['unresolved', 'resolved', 'ignored']),
})

const assignSchema = z.object({
  assignee: z.string().nullable().optional(),
  user_id: z.string().nullable().optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  await seedDemoForUser(userId)
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.project_id) {
    where.push({ field: 'project_id', operator: '=', value: String(req.query.project_id) })
  }
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  if (req.query.level) {
    where.push({ field: 'level', operator: '=', value: String(req.query.level) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 100
  const issues = await findMany<Record<string, unknown>>('issues', {
    where,
    orderBy: [{ field: 'last_seen', direction: 'desc' }],
    limit,
  })
  const assigneeNameById = await loadAssigneeNames(userId)
  res.json(issues.map((i) => projectIssueRow(i, assigneeNameById)))
})

const loadAssigneeNames = async (userId: string): Promise<Map<string, string>> => {
  const members = await findMany<{ id: string; name: string | null; email: string | null }>(
    'team_members',
    {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 500,
    },
  )
  const map = new Map<string, string>()
  for (const m of members) {
    map.set(String(m.id), m.name ?? m.email ?? 'Member')
  }
  return map
}

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const issue = await findById<Record<string, unknown>>('issues', id)
  if (!issue || issue.user_id !== userId) {
    return res.status(404).json({ error: t('issues.notFound') })
  }
  const events = await findMany<Record<string, unknown>>('error_events', {
    where: [
      { field: 'issue_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 20,
  })
  // Project events into the IssueDetail page's expected shape (id,
  // environment, release, timestamp, user{id,email}, user_agent).
  const recent_events = events.map((e) => {
    const tags = (e.tags as Record<string, unknown> | null) ?? {}
    return {
      id: String(e.id),
      environment: String(e.environment ?? 'production'),
      release: String(e.release ?? ''),
      timestamp: String(e.created_at ?? new Date().toISOString()),
      user: {
        id: String(tags.user_id ?? userId),
        email: String(tags.user_email ?? ''),
      },
      user_agent: String(e.user_agent ?? ''),
    }
  })
  const assigneeNameById = await loadAssigneeNames(userId)
  res.json({ ...projectIssueRow(issue, assigneeNameById), recent_events })
})

router.put('/:id/status', validateBody(updateStatusSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const issue = await findById<Record<string, unknown>>('issues', id)
  if (!issue || issue.user_id !== userId) {
    return res.status(404).json({ error: t('issues.notFound') })
  }
  const status = (req.body as { status: string }).status
  const result = await updateById('issues', id, {
    status,
    resolved_at: status === 'resolved' ? new Date() : null,
    updated_at: new Date(),
  })
  res.json(result.data)
})

router.put('/:id/assign', validateBody(assignSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const issue = await findById<Record<string, unknown>>('issues', id)
  if (!issue || issue.user_id !== userId) {
    return res.status(404).json({ error: t('issues.notFound') })
  }
  const body = req.body as { user_id?: string | null; assignee?: string | null }
  // The issues.assigned_to column is uuid — accept either user_id (a
  // team_members.id uuid) or fall back to nulling.
  const candidate = body.user_id ?? null
  const assignedToValue =
    candidate &&
    /^[0-9a-f-]{8}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{4}-[0-9a-f-]{12}$/i.test(candidate)
      ? candidate
      : null
  const result = await updateById('issues', id, {
    assigned_to: assignedToValue,
    updated_at: new Date(),
  })
  const assigneeNameById = await loadAssigneeNames(userId)
  const data = (result.data ?? {}) as Record<string, unknown>
  res.json({
    ...data,
    assignee: assignedToValue
      ? (assigneeNameById.get(assignedToValue) ?? body.assignee ?? null)
      : null,
  })
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const id = getParamId(req)
  const issue = await findById<Record<string, unknown>>('issues', id)
  if (!issue || issue.user_id !== userId) {
    return res.status(404).json({ error: t('issues.notFound') })
  }
  await deleteById('issues', id)
  res.status(204).end()
})

const createSchema = z.object({
  project_id: z.string().min(1),
  fingerprint: z.string().min(1),
  title: z.string().min(1),
  level: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),
  environment: z.string().optional(),
  release: z.string().optional(),
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({ error: t('auth.unauthorized') })
  }
  const body = req.body as z.infer<typeof createSchema>
  const result = await create('issues', {
    user_id: userId,
    project_id: body.project_id,
    fingerprint: body.fingerprint,
    title: body.title,
    level: body.level ?? 'error',
    environment: body.environment ?? 'production',
    release: body.release ?? null,
    status: 'unresolved',
    first_seen: new Date(),
    last_seen: new Date(),
  })
  res.status(201).json(result.data)
})

export default router
