/**
 * Error events handler — ingestion + retrieval. Per INVENTORY user flow 1
 * v1 ingestion uses the authenticated user's session (DSN-based ingestion
 * is deferred to v2). Validation via zod + `@molecule/api-middleware-validation`,
 * authorization scopes by `user_id` to prevent IDOR.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const ingestSchema = z.object({
  project_id: z.string().min(1),
  message: z.string().min(1),
  stack_trace: z.string().optional(),
  level: z.enum(['debug', 'info', 'warning', 'error', 'fatal']).optional(),
  environment: z.string().optional(),
  release: z.string().optional(),
  tags: z.record(z.string(), z.unknown()).optional(),
  extra: z.record(z.string(), z.unknown()).optional(),
})

const listQuerySchema = z.object({
  project_id: z.string().optional(),
  issue_id: z.string().optional(),
  level: z.string().optional(),
  environment: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

router.post('/ingest', validateBody(ingestSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const body = req.body as z.infer<typeof ingestSchema>
  const fingerprint = generateFingerprint(body.message, body.stack_trace)

  const matches = await findMany<Record<string, unknown>>('issues', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'project_id', operator: '=', value: body.project_id },
      { field: 'fingerprint', operator: '=', value: fingerprint },
    ],
    limit: 1,
  })
  let issue: Record<string, unknown> | null = matches[0] ?? null
  if (!issue) {
    const created = await create<Record<string, unknown>>('issues', {
      user_id: userId,
      project_id: body.project_id,
      fingerprint,
      title: body.message,
      level: body.level ?? 'error',
      status: 'unresolved',
      environment: body.environment ?? 'production',
      release: body.release ?? null,
      first_seen: new Date(),
      last_seen: new Date(),
      event_count: 1,
      user_count: 0,
    })
    issue = created.data
  } else {
    // bump last_seen + event_count on the existing issue so the dashboard
    // reflects the new event without waiting for a re-fingerprint pass.
    // A new event for a RESOLVED issue is a REGRESSION: reopen it and flag it so
    // the "top regressions" board (discover.ts, filters is_regression && status !==
    // 'resolved') surfaces it. Previously ingest never read status, so a resolved
    // issue that recurred stayed silently resolved and is_regression was never set.
    // An 'ignored' issue stays muted by design; an already-unresolved one is unchanged.
    const wasResolved = String(issue.status ?? '') === 'resolved'
    await updateById('issues', String(issue.id), {
      last_seen: new Date(),
      event_count: Number(issue.event_count ?? 0) + 1,
      updated_at: new Date(),
      ...(wasResolved ? { status: 'unresolved', is_regression: true, resolved_at: null } : {}),
    })
  }
  if (!issue) {
    return res.status(500).json({ error: t('errors.internalServer') })
  }

  const event = await create<Record<string, unknown>>('error_events', {
    user_id: userId,
    issue_id: issue.id,
    project_id: body.project_id,
    message: body.message,
    stack_trace: body.stack_trace ?? '',
    level: body.level ?? 'error',
    environment: body.environment ?? 'production',
    release: body.release ?? null,
    tags: JSON.stringify(body.tags ?? {}),
    extra: JSON.stringify(body.extra ?? {}),
    user_agent: req.headers['user-agent'] ?? null,
    ip_address: req.ip ?? null,
    created_at: new Date(),
  })
  res.status(201).json({ event_id: event.data?.id ?? null, issue_id: issue.id })
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (req.query.project_id) {
    where.push({ field: 'project_id', operator: '=', value: String(req.query.project_id) })
  }
  if (req.query.issue_id) {
    where.push({ field: 'issue_id', operator: '=', value: String(req.query.issue_id) })
  }
  if (req.query.level) {
    where.push({ field: 'level', operator: '=', value: String(req.query.level) })
  }
  if (req.query.environment) {
    where.push({ field: 'environment', operator: '=', value: String(req.query.environment) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const events = await findMany('error_events', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit,
  })
  res.json(events)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const id = getParamId(req)
  const event = await findById<Record<string, unknown>>('error_events', id)
  if (!event || event.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  res.json(event)
})

function generateFingerprint(message: string, stackTrace?: string): string {
  const normalized = (stackTrace ?? message)
    .replace(/:\d+:\d+/g, ':X:X')
    .replace(/0x[0-9a-f]+/gi, '0xX')
    .trim()
  let hash = 0
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i)
    hash = (hash << 5) - hash + code
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export default router
