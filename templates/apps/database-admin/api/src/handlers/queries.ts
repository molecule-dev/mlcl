/**
 * queries handler — proxies SQL to a user-registered remote DB through
 * `@molecule/api-database-remote`, records every execution to
 * `query_history`, and exposes owner-scoped CRUD for `saved_queries`.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { connectRemote, type RemoteDb } from '@molecule/api-database-remote'
import { decrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { DatabaseAdminLimits } from '../tiers.js'

const router = Router()

// Free-tier saved-query cap — advertised on the Pricing page and defined in tiers.ts, but the
// create route never enforced it (unlike the sibling connections handler's maxConnections). Gate it.
const enforceQueryLimit = enforceLimit<DatabaseAdminLimits>({
  limitType: 'maxQueries',
  getLimit: (limits) => limits.maxQueries,
  getCurrent: async (userId) =>
    count('saved_queries', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const executeSchema = z.object({
  connection_id: z.string().uuid(),
  sql: z.string().min(1).max(65536),
})

const saveQuerySchema = z.object({
  connection_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  sql: z.string().min(1).max(65536),
  description: z.string().max(2000).optional(),
})

const updateSavedSchema = saveQuerySchema.partial()

router.post('/execute', validateBody(executeSchema), async (req: Request, res: Response) => {
  const startTime = Date.now()
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof executeSchema>
  const conn = await findById<Record<string, unknown>>('connections', body.connection_id)
  if (!conn || conn.user_id !== userId) {
    return res.status(404).json({ error: t('connections.notFound') })
  }
  let remote: RemoteDb | null = null
  let status: 'success' | 'error' = 'success'
  let rowCount = 0
  let errorMessage: string | null = null
  let rows: Array<Record<string, unknown>> = []
  let columns: Array<{ name: string; dataType?: string }> = []
  try {
    const ciphertext = (conn.connection_string as string | undefined) ?? ''
    if (!ciphertext) throw new Error(t('connections.noConnectionString'))
    const url = await decrypt(ciphertext)
    const driver = (conn.driver as string | undefined) ?? 'postgresql'
    remote = await connectRemote({
      url,
      type: driver as 'postgresql' | 'mysql' | 'sqlite',
      readonly: true,
    })
    const result = await remote.runQuery(body.sql, [], { timeoutMs: 30_000, maxRows: 1_000 })
    rows = result.rows
    columns = result.columns
    rowCount = result.rowCount
  } catch (error) {
    status = 'error'
    errorMessage = error instanceof Error ? error.message : t('queries.executionFailed')
  } finally {
    if (remote) await remote.disconnect().catch(() => undefined)
  }

  const duration = Date.now() - startTime
  await create('query_history', {
    user_id: userId,
    connection_id: body.connection_id,
    sql: body.sql,
    status,
    row_count: rowCount,
    duration_ms: duration,
    error_message: errorMessage,
    created_at: new Date(),
  }).catch(() => undefined)

  if (status === 'error') {
    return res.status(400).json({ error: errorMessage, duration_ms: duration })
  }
  res.json({ rows, columns, row_count: rowCount, duration_ms: duration })
})

router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const rawLimit = Number(req.query.limit)
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 50
    const rows = await findMany('query_history', { where, orderBy, limit })
    res.json(rows)
  } catch (error) {
    logger.error('queries.history.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/saved', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
    const rows = await findMany('saved_queries', { where, orderBy })
    res.json(rows)
  } catch (error) {
    logger.error('queries.saved.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/saved/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('saved_queries', getParamId(req))
    if (!row || row.user_id !== userId) {
      return res.status(404).json({ error: t('queries.savedNotFound') })
    }
    res.json(row)
  } catch (error) {
    logger.error('queries.saved.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/saved',
  enforceQueryLimit,
  validateBody(saveQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const body = req.body as z.infer<typeof saveQuerySchema>
      const result = await create('saved_queries', {
        user_id: userId,
        connection_id: body.connection_id ?? null,
        name: body.name,
        sql: body.sql,
        description: body.description ?? '',
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data?: unknown }).data ?? result)
    } catch (error) {
      logger.error('queries.saved.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/saved/:id', validateBody(updateSavedSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('saved_queries', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('queries.savedNotFound') })
    }
    const updates: Record<string, unknown> = {
      ...(req.body as Record<string, unknown>),
      updated_at: new Date(),
    }
    const result = await updateById('saved_queries', id, updates)
    res.json((result as { data?: unknown }).data ?? result)
  } catch (error) {
    logger.error('queries.saved.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.delete('/saved/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('saved_queries', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('queries.savedNotFound') })
    }
    await deleteById('saved_queries', id)
    res.status(204).end()
  } catch (error) {
    logger.error('queries.saved.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
