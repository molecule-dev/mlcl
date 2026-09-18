/**
 * log-viewer — logs (search + ingest + stats).
 *
 * Each handler:
 *   - Authenticates the request via the user-resource verifyMiddleware
 *     (ingest endpoints are also user-scoped in v1; v2 will add per-source
 *     ingest tokens).
 *   - Resolves session.userId from res.locals (the molecule auth contract).
 *   - Scopes every read/write by user_id (no IDOR).
 *   - Validates request bodies/queries with zod via @molecule/api-middleware-validation.
 *   - Routes through the abstract DataStore (no raw SQL here).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  findById,
  findMany,
  type OrderBy,
  type WhereCondition,
} from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { LogViewerLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const SEVERITY_VALUES = ['trace', 'debug', 'info', 'warn', 'warning', 'error', 'fatal'] as const

const listLogsQuerySchema = z.object({
  q: z.string().max(1000).optional(),
  source_id: z.string().uuid().optional(),
  service: z.string().max(255).optional(),
  severity: z.enum(SEVERITY_VALUES).optional(),
  level: z.enum(SEVERITY_VALUES).optional(),
  environment: z.string().max(64).optional(),
  trace_id: z.string().max(255).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
})

const ingestEntrySchema = z.object({
  source_id: z.string().uuid().optional(),
  service: z.string().max(255).optional(),
  severity: z.enum(SEVERITY_VALUES).optional(),
  level: z.enum(SEVERITY_VALUES).optional(),
  message: z.string().min(1),
  host: z.string().max(255).optional(),
  environment: z.string().max(64).optional(),
  trace_id: z.string().max(255).optional(),
  span_id: z.string().max(255).optional(),
  fields: z.record(z.string(), z.unknown()).optional(),
  structured_data: z.record(z.string(), z.unknown()).optional(),
  timestamp: z.string().datetime().optional(),
})

const ingestSchema = z.union([ingestEntrySchema, z.array(ingestEntrySchema).min(1).max(500)])

router.get('/', validateQuery(listLogsQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const q = req.query as unknown as z.infer<typeof listLogsQuerySchema>
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (q.source_id) where.push({ field: 'source_id', operator: '=', value: q.source_id })
  if (q.service) where.push({ field: 'service', operator: '=', value: q.service })
  const sev = q.severity ?? q.level
  if (sev) where.push({ field: 'severity', operator: '=', value: sev })
  if (q.environment) where.push({ field: 'environment', operator: '=', value: q.environment })
  if (q.trace_id) where.push({ field: 'trace_id', operator: '=', value: q.trace_id })
  if (q.q) where.push({ field: 'message', operator: 'ilike', value: q.q })

  const orderBy: OrderBy[] = [{ field: 'timestamp', direction: 'desc' }]
  const logs = (await findMany<Record<string, unknown>>('logs', {
    where,
    orderBy,
    limit: q.limit,
    offset: q.offset,
  })) as Array<Record<string, unknown>>
  // Surface the timestamp as ISO so the React UI can display it
  // straight without re-serializing Date instances.
  const decorated = logs.map((row) => ({
    ...row,
    timestamp: row.timestamp instanceof Date ? row.timestamp.toISOString() : row.timestamp,
  }))
  res.json(decorated)
})

router.post('/ingest', validateBody(ingestSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }

  await seedDemoForUser(userId)
  const body = req.body as z.infer<typeof ingestSchema>
  const entries = Array.isArray(body) ? body : [body]

  const existing = await count('logs', [{ field: 'user_id', operator: '=', value: userId }])
  const tier = await getEffectiveTier<LogViewerLimits>(res)
  if (existing + entries.length > tier.limits.maxLogs) {
    res.status(403).json({
      error: t(
        'logs.limitReached',
        {},
        {
          defaultValue:
            'You have reached your log retention limit. Upgrade your plan to ingest more.',
        },
      ),
      limitType: 'maxLogs',
      currentLimit: tier.limits.maxLogs,
      category: tier.category,
    })
    return
  }

  const created: Array<Record<string, unknown>> = []
  for (const entry of entries) {
    const sev = entry.severity ?? entry.level ?? 'info'
    const result = await create<Record<string, unknown>>('logs', {
      user_id: userId,
      source_id: entry.source_id ?? null,
      service: entry.service ?? '',
      severity: sev,
      level: sev,
      message: entry.message,
      host: entry.host ?? '',
      environment: entry.environment ?? 'production',
      trace_id: entry.trace_id ?? null,
      span_id: entry.span_id ?? null,
      fields: JSON.stringify(entry.fields ?? {}),
      structured_data: entry.structured_data ? JSON.stringify(entry.structured_data) : null,
      timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
      created_at: new Date(),
    })
    if (result.data) created.push(result.data)
  }

  res.status(201).json({ count: created.length, items: created })
})

router.get('/stats', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)

  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (typeof req.query.source_id === 'string') {
    where.push({ field: 'source_id', operator: '=', value: req.query.source_id })
  }

  const recent = await findMany<Record<string, unknown>>('logs', {
    where,
    orderBy: [{ field: 'timestamp', direction: 'desc' }],
    limit: 1000,
  })

  const stats = {
    total: recent.length,
    by_level: {} as Record<string, number>,
    by_service: {} as Record<string, number>,
  }

  for (const log of recent) {
    const level = (log.severity as string | null) ?? (log.level as string | null) ?? 'info'
    const service = (log.service as string | null) ?? ''
    stats.by_level[level] = (stats.by_level[level] ?? 0) + 1
    if (service) stats.by_service[service] = (stats.by_service[service] ?? 0) + 1
  }

  res.json(stats)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const log = await findById<Record<string, unknown>>('logs', id)
  if (!log || log.user_id !== userId) {
    res.status(404).json({ error: t('logs.notFound', {}, { defaultValue: 'Log entry not found' }) })
    return
  }
  res.json({
    ...log,
    timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp,
  })
})

export default router
