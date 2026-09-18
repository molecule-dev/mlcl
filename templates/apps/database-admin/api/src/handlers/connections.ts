/**
 * connections handler — owner-scoped CRUD for user-registered remote
 * databases. The DSN (`postgresql://user:pass@host:port/db`) is built from
 * the form fields, encrypted via @molecule/api-encryption-aes, and stored
 * as `connection_string`. The plain-text password is never persisted.
 *
 * The `/test` endpoint really opens a transient remote connection through
 * `@molecule/api-database-remote` and pings it, so a green badge means the
 * stored credentials actually work — not just that the form submitted.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { connectRemote } from '@molecule/api-database-remote'
import { decrypt, encrypt } from '@molecule/api-encryption'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { DatabaseAdminLimits } from '../tiers.js'

const enforceConnectionLimit = enforceLimit<DatabaseAdminLimits>({
  limitType: 'maxConnections',
  getLimit: (limits) => limits.maxConnections,
  getCurrent: async (userId) =>
    count('connections', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const router = Router()

function stripSecrets(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== 'object') return {}
  const copy: Record<string, unknown> = { ...(row as Record<string, unknown>) }
  delete copy.connection_string
  delete copy.password
  return copy
}

/**
 * Build a DSN from the user-supplied connection fields. The password is
 * percent-encoded so reserved characters (e.g. `@`, `:`) survive the URL.
 */
function buildDsn(fields: {
  driver: 'postgresql' | 'mysql' | 'sqlite'
  host: string
  port: number
  database_name: string
  username: string
  password?: string
  ssl?: boolean
}): string {
  if (fields.driver === 'sqlite') {
    return fields.database_name
  }
  const scheme = fields.driver === 'mysql' ? 'mysql' : 'postgresql'
  const user = encodeURIComponent(fields.username)
  const pass = fields.password ? `:${encodeURIComponent(fields.password)}` : ''
  const sslSuffix = fields.ssl ? '?sslmode=require' : ''
  return `${scheme}://${user}${pass}@${fields.host}:${fields.port}/${fields.database_name}${sslSuffix}`
}

const createConnectionSchema = z.object({
  name: z.string().min(1).max(255),
  host: z.string().min(1).max(255).default('localhost'),
  port: z.number().int().min(1).max(65535).default(5432),
  database_name: z.string().min(1).max(255),
  username: z.string().min(1).max(255).default(''),
  password: z.string().max(1024).optional(),
  ssl: z.boolean().default(false),
  color: z.string().max(32).default('#3b82f6'),
  driver: z.enum(['postgresql', 'mysql', 'sqlite']).default('postgresql'),
})

const updateConnectionSchema = createConnectionSchema.partial()

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
    const rows = await findMany('connections', { where, orderBy })
    res.json((rows as unknown[]).map(stripSecrets))
  } catch (error) {
    logger.error('connections.list', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await findById<Record<string, unknown>>('connections', getParamId(req))
    if (!row || (row as Record<string, unknown>).user_id !== userId) {
      return res.status(404).json({ error: t('connections.notFound') })
    }
    res.json(stripSecrets(row))
  } catch (error) {
    logger.error('connections.get', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post(
  '/',
  validateBody(createConnectionSchema),
  enforceConnectionLimit,
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
      const body = req.body as z.infer<typeof createConnectionSchema>
      const dsn = buildDsn(body)
      const result = await create('connections', {
        user_id: userId,
        name: body.name,
        host: body.host,
        port: body.port,
        database_name: body.database_name,
        username: body.username,
        connection_string: await encrypt(dsn),
        ssl: body.ssl,
        color: body.color,
        driver: body.driver,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(stripSecrets((result as { data?: unknown }).data ?? result))
    } catch (error) {
      logger.error('connections.create', error)
      res.status(500).json({ error: t('errors.internalServer') })
    }
  },
)

router.put('/:id', validateBody(updateConnectionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('connections', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('connections.notFound') })
    }
    const body = req.body as z.infer<typeof updateConnectionSchema>
    const updates: Record<string, unknown> = { ...body, updated_at: new Date() }
    delete updates.password

    // Re-build the DSN whenever any field that goes into it changes; only
    // touch `connection_string` if we have a new password OR another field
    // changed. Otherwise the existing encrypted DSN is preserved verbatim.
    const dsnFieldsChanged =
      'host' in body ||
      'port' in body ||
      'database_name' in body ||
      'username' in body ||
      'driver' in body ||
      'ssl' in body ||
      typeof body.password === 'string'
    if (dsnFieldsChanged) {
      const merged = {
        driver: (body.driver ?? (existing.driver as 'postgresql' | 'mysql' | 'sqlite')) as
          'postgresql' | 'mysql' | 'sqlite',
        host: body.host ?? (existing.host as string),
        port: body.port ?? (existing.port as number),
        database_name: body.database_name ?? (existing.database_name as string),
        username: body.username ?? (existing.username as string),
        ssl: body.ssl ?? (existing.ssl as boolean),
        password: body.password,
      }
      // If no new password supplied, we have to peel the old password out
      // of the existing encrypted DSN so the updated DSN keeps working.
      if (typeof merged.password !== 'string' && existing.connection_string) {
        try {
          const old = await decrypt(existing.connection_string as string)
          const m = old.match(/:[^@/]+@/)
          if (m) merged.password = decodeURIComponent(m[0].slice(1, -1))
        } catch (_error) {
          /* corrupt or missing — store the new DSN without a password */
        }
      }
      updates.connection_string = await encrypt(buildDsn(merged))
    }

    const result = await updateById('connections', id, updates)
    res.json(stripSecrets((result as { data?: unknown }).data ?? result))
  } catch (error) {
    logger.error('connections.update', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const conn = await findById<Record<string, unknown>>('connections', id)
    if (!conn || conn.user_id !== userId) {
      return res.status(404).json({ error: t('connections.notFound') })
    }
    const ciphertext = (conn.connection_string as string | undefined) ?? ''
    if (!ciphertext) {
      return res.status(400).json({ success: false, error: t('connections.noConnectionString') })
    }
    const url = await decrypt(ciphertext)
    const driver = (conn.driver as string | undefined) ?? 'postgresql'
    const startedAt = Date.now()
    const remote = await connectRemote({
      url,
      type: driver as 'postgresql' | 'mysql' | 'sqlite',
      readonly: false,
    })
    try {
      // A successful `connectRemote` already probed the pool. Run a trivial
      // query to also verify auth/round-trip, then close.
      await remote.runQuery(driver === 'sqlite' ? 'SELECT 1' : 'SELECT 1', [], {
        timeoutMs: 5_000,
        maxRows: 1,
      })
    } finally {
      try {
        await remote.disconnect()
      } catch (_error) {
        /* ignore — disconnect failure does not affect the test result */
      }
    }
    res.json({ success: true, latency_ms: Date.now() - startedAt })
  } catch (error) {
    const message = error instanceof Error ? error.message : t('connections.testFailed')
    res.status(400).json({ success: false, error: message })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('connections', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({ error: t('connections.notFound') })
    }
    await deleteById('connections', id)
    res.status(204).end()
  } catch (error) {
    logger.error('connections.delete', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
