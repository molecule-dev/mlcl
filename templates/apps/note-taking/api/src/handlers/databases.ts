/**
 * Note-database handlers — Notion-style database pages with rows.
 *
 * Each `note_databases` row defines a schema (columns + types) and lives
 * inside a workspace; rows are stored in `database_rows` as flexible jsonb
 * keyed by the schema's column ids. Authorization always derives from
 * workspace ownership via `requireDatabase` / `requireDatabaseRow`.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import {
  count,
  create,
  deleteById,
  deleteMany,
  findMany,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import {
  type DatabaseRow,
  internalError,
  type NoteDatabaseRow,
  requireDatabase,
  requireDatabaseRow,
  requirePage,
  requireUser,
  requireWorkspace,
  validationError,
} from '../lib/authz.js'
import type { NoteTakingLimits } from '../tiers.js'

const router = Router()

const idParam = z.object({ id: z.string().uuid() })
const rowIdParam = z.object({ id: z.string().uuid(), rowId: z.string().uuid() })

const listSchema = z.object({
  workspace_id: z.string().uuid(),
})

const viewTypeSchema = z.enum(['table', 'board', 'calendar', 'list', 'gallery'])

const createSchema = z.object({
  workspace_id: z.string().uuid(),
  page_id: z.string().uuid().nullable().optional(),
  name: z.string().max(255).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  view_type: viewTypeSchema.optional(),
})

const updateSchema = z.object({
  name: z.string().max(255).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  view_type: viewTypeSchema.optional(),
  page_id: z.string().uuid().nullable().optional(),
})

const rowCreateSchema = z.object({
  values: z.record(z.string(), z.unknown()).optional(),
  position: z.number().optional(),
})

const rowUpdateSchema = z.object({
  values: z.record(z.string(), z.unknown()),
})

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = listSchema.safeParse(req.query)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
    if (!ws) {
      res.json([])
      return
    }
    const items = await findMany<NoteDatabaseRow>('note_databases', {
      where: [{ field: 'workspace_id', operator: '=', value: parsed.data.workspace_id }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    internalError(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const db = await requireDatabase(id.data.id, ownerId)
    if (!db) {
      res
        .status(404)
        .json({ error: t('database.notFound', {}, { defaultValue: 'Database not found' }) })
      return
    }
    const rows = await findMany<DatabaseRow>('database_rows', {
      where: [{ field: 'database_id', operator: '=', value: db.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...db, rows })
  } catch (error) {
    internalError(res, error)
  }
})

// Enforce the per-tier database cap (tiers.ts maxDatabases) — defined + shown on Pricing but
// enforceLimit was never called anywhere, so any tier could create unlimited databases.
const enforceDatabaseLimit = enforceLimit<NoteTakingLimits>({
  limitType: 'maxDatabases',
  getLimit: (limits) => limits.maxDatabases,
  getCurrent: async (userId) =>
    count('note_databases', [{ field: 'created_by', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceDatabaseLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const ws = await requireWorkspace(parsed.data.workspace_id, ownerId)
    if (!ws) {
      res
        .status(404)
        .json({ error: t('workspace.notFound', {}, { defaultValue: 'Workspace not found' }) })
      return
    }
    if (parsed.data.page_id) {
      const page = await requirePage(parsed.data.page_id, ownerId)
      if (!page || page.workspace_id !== ws.id) {
        res.status(404).json({ error: t('page.notFound', {}, { defaultValue: 'Page not found' }) })
        return
      }
    }
    const result = await create<NoteDatabaseRow>('note_databases', {
      workspace_id: ws.id,
      page_id: parsed.data.page_id ?? null,
      name: parsed.data.name ?? t('database.untitled', {}, { defaultValue: 'Untitled Database' }),
      schema: parsed.data.schema ?? { columns: [] },
      view_type: parsed.data.view_type ?? 'table',
      created_by: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = updateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const db = await requireDatabase(id.data.id, ownerId)
    if (!db) {
      res
        .status(404)
        .json({ error: t('database.notFound', {}, { defaultValue: 'Database not found' }) })
      return
    }
    const result = await updateById<NoteDatabaseRow>('note_databases', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.post('/:id/rows', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = rowCreateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, id.success ? body.error?.issues : id.error.issues)
    return
  }
  try {
    const db = await requireDatabase(id.data.id, ownerId)
    if (!db) {
      res
        .status(404)
        .json({ error: t('database.notFound', {}, { defaultValue: 'Database not found' }) })
      return
    }
    const position = body.data.position ?? (await getNextRowPosition(db.id))
    const result = await create<DatabaseRow>('database_rows', {
      database_id: db.id,
      values: body.data.values ?? {},
      position,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.patch('/:id/rows/:rowId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = rowIdParam.safeParse(req.params)
  const body = rowUpdateSchema.safeParse(req.body)
  if (!params.success || !body.success) {
    validationError(res, params.success ? body.error?.issues : params.error.issues)
    return
  }
  try {
    const row = await requireDatabaseRow(params.data.rowId, ownerId)
    if (!row || row.database_id !== params.data.id) {
      res
        .status(404)
        .json({ error: t('databaseRow.notFound', {}, { defaultValue: 'Row not found' }) })
      return
    }
    const result = await updateById<DatabaseRow>('database_rows', params.data.rowId, {
      values: body.data.values,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id/rows/:rowId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = rowIdParam.safeParse(req.params)
  if (!params.success) {
    validationError(res, params.error.issues)
    return
  }
  try {
    const row = await requireDatabaseRow(params.data.rowId, ownerId)
    if (!row || row.database_id !== params.data.id) {
      res
        .status(404)
        .json({ error: t('databaseRow.notFound', {}, { defaultValue: 'Row not found' }) })
      return
    }
    await deleteById('database_rows', params.data.rowId)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const db = await requireDatabase(id.data.id, ownerId)
    if (!db) {
      res
        .status(404)
        .json({ error: t('database.notFound', {}, { defaultValue: 'Database not found' }) })
      return
    }
    // Schema CASCADE handles row cleanup; explicit deleteMany is a guard
    // against providers that return 0-row CASCADE behaviour.
    await deleteMany('database_rows', [{ field: 'database_id', operator: '=', value: db.id }])
    await deleteById('note_databases', id.data.id)
    res.status(204).end()
  } catch (error) {
    internalError(res, error)
  }
})

async function getNextRowPosition(databaseId: string): Promise<number> {
  const where: WhereCondition[] = [{ field: 'database_id', operator: '=', value: databaseId }]
  const rows = await findMany<DatabaseRow>('database_rows', {
    where,
    orderBy: [{ field: 'position', direction: 'desc' }],
    limit: 1,
  })
  return rows.length > 0 ? rows[0].position + 1 : 0
}

export default router
