/**
 * schema handler — proxies introspection to a user-registered remote
 * database via `@molecule/api-database-remote`. Every introspection
 * route is owner-scoped on the parent connection.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById } from '@molecule/api-database'
import { connectRemote, type RemoteDb } from '@molecule/api-database-remote'
import { decrypt } from '@molecule/api-encryption'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const connectionQuery = z.object({
  connection_id: z.string().uuid(),
})

const dataQuery = connectionQuery.extend({
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

interface OkAuth {
  ok: true
  conn: Record<string, unknown>
}
interface FailAuth {
  ok: false
  status: number
  error: string
}

async function authorizeConnection(
  res: Response,
  connectionId: string,
): Promise<OkAuth | FailAuth> {
  const userId = getUserId(res)
  if (!userId) return { ok: false, status: 401, error: t('auth.unauthorized') }
  const conn = await findById<Record<string, unknown>>('connections', connectionId)
  if (!conn || conn.user_id !== userId) {
    return { ok: false, status: 404, error: t('connections.notFound') }
  }
  return { ok: true, conn }
}

async function openRemote(conn: Record<string, unknown>): Promise<RemoteDb> {
  const ciphertext = (conn.connection_string as string | undefined) ?? ''
  if (!ciphertext) throw new Error(t('connections.noConnectionString'))
  const url = await decrypt(ciphertext)
  const driver = (conn.driver as string | undefined) ?? 'postgresql'
  return connectRemote({
    url,
    type: driver as 'postgresql' | 'mysql' | 'sqlite',
    readonly: true,
  })
}

function getDefaultSchema(driver: string, conn: Record<string, unknown>): string {
  if (driver === 'sqlite') return 'main'
  if (driver === 'mysql') return (conn.database_name as string) ?? ''
  return 'public'
}

router.get('/tables', validateQuery(connectionQuery), async (req: Request, res: Response) => {
  let remote: RemoteDb | null = null
  try {
    const { connection_id } = req.query as unknown as z.infer<typeof connectionQuery>
    const auth = await authorizeConnection(res, connection_id)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })
    remote = await openRemote(auth.conn)
    const driver = (auth.conn.driver as string | undefined) ?? 'postgresql'
    const schema = getDefaultSchema(driver, auth.conn)
    const tables = await remote.listTables(schema)
    res.json(
      tables.map((t) => ({
        name: t.name,
        schema: t.schema,
        type: t.type,
      })),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : t('errors.internalServer')
    res.status(500).json({ error: message })
  } finally {
    if (remote) await remote.disconnect().catch(() => undefined)
  }
})

router.get(
  '/tables/:tableName/columns',
  validateQuery(connectionQuery),
  async (req: Request, res: Response) => {
    let remote: RemoteDb | null = null
    try {
      const { connection_id } = req.query as unknown as z.infer<typeof connectionQuery>
      const auth = await authorizeConnection(res, connection_id)
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error })
      remote = await openRemote(auth.conn)
      const driver = (auth.conn.driver as string | undefined) ?? 'postgresql'
      const schema = getDefaultSchema(driver, auth.conn)
      const desc = await remote.describeTable(schema, req.params.tableName as string)
      res.json(desc.columns)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.internalServer')
      res.status(500).json({ error: message })
    } finally {
      if (remote) await remote.disconnect().catch(() => undefined)
    }
  },
)

router.get(
  '/tables/:tableName/indexes',
  validateQuery(connectionQuery),
  async (req: Request, res: Response) => {
    let remote: RemoteDb | null = null
    try {
      const { connection_id } = req.query as unknown as z.infer<typeof connectionQuery>
      const auth = await authorizeConnection(res, connection_id)
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error })
      remote = await openRemote(auth.conn)
      const driver = (auth.conn.driver as string | undefined) ?? 'postgresql'
      const schema = getDefaultSchema(driver, auth.conn)
      const desc = await remote.describeTable(schema, req.params.tableName as string)
      res.json(desc.indexes)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.internalServer')
      res.status(500).json({ error: message })
    } finally {
      if (remote) await remote.disconnect().catch(() => undefined)
    }
  },
)

router.get(
  '/tables/:tableName/foreign-keys',
  validateQuery(connectionQuery),
  async (req: Request, res: Response) => {
    let remote: RemoteDb | null = null
    try {
      const { connection_id } = req.query as unknown as z.infer<typeof connectionQuery>
      const auth = await authorizeConnection(res, connection_id)
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error })
      remote = await openRemote(auth.conn)
      const driver = (auth.conn.driver as string | undefined) ?? 'postgresql'
      const schema = getDefaultSchema(driver, auth.conn)
      const desc = await remote.describeTable(schema, req.params.tableName as string)
      res.json(desc.foreignKeys)
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.internalServer')
      res.status(500).json({ error: message })
    } finally {
      if (remote) await remote.disconnect().catch(() => undefined)
    }
  },
)

/**
 * Identifier safety check: only allow what postgres treats as an unquoted
 * identifier. A defence-in-depth measure on top of `describeTable` already
 * having validated the table existed.
 */
function safeIdent(s: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(s)
}

router.get(
  '/tables/:tableName/data',
  validateQuery(dataQuery),
  async (req: Request, res: Response) => {
    let remote: RemoteDb | null = null
    try {
      const {
        connection_id,
        limit = 50,
        offset = 0,
      } = req.query as unknown as z.infer<typeof dataQuery>
      const auth = await authorizeConnection(res, connection_id)
      if (!auth.ok) return res.status(auth.status).json({ error: auth.error })
      const tableName = req.params.tableName as string
      if (!safeIdent(tableName)) {
        return res.status(400).json({ error: t('schema.invalidTableName') })
      }
      remote = await openRemote(auth.conn)
      const driver = (auth.conn.driver as string | undefined) ?? 'postgresql'
      const schema = getDefaultSchema(driver, auth.conn)
      // Confirm the table exists (and surface table-not-found cleanly)
      // before running a SELECT against it.
      await remote.describeTable(schema, tableName)
      const lim = Math.max(1, Math.min(500, Number(limit) || 50))
      const off = Math.max(0, Number(offset) || 0)
      const qualified =
        driver === 'postgresql'
          ? `"${schema}"."${tableName}"`
          : driver === 'mysql'
            ? `\`${tableName}\``
            : `"${tableName}"`
      const sql =
        driver === 'postgresql'
          ? `SELECT * FROM ${qualified} LIMIT $1 OFFSET $2`
          : `SELECT * FROM ${qualified} LIMIT ? OFFSET ?`
      const result = await remote.runQuery(sql, [lim, off], { timeoutMs: 10_000, maxRows: lim })
      res.json({
        rows: result.rows,
        columns: result.columns,
        row_count: result.rowCount,
        limit: lim,
        offset: off,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : t('errors.internalServer')
      res.status(500).json({ error: message })
    } finally {
      if (remote) await remote.disconnect().catch(() => undefined)
    }
  },
)

export default router
