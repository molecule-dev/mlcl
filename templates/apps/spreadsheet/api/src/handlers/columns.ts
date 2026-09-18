/**
 * Column handlers — owner-scoped CRUD for columns within a sheet.
 *
 * Columns are derived authz from their parent sheet (which itself derives
 * from spreadsheet). Every read/write filters by `owner_id =
 * session.userId` so cross-user IDOR returns 404.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { safeBroadcast } from '../lib/safe-realtime.js'

const router = Router()

const COLUMN_TYPES = [
  'text',
  'number',
  'currency',
  'date',
  'datetime',
  'checkbox',
  'select',
  'multi-select',
  'formula',
  'url',
  'email',
  'relation',
] as const

const columnConfigSchema = z.record(z.string(), z.unknown()).optional()

const columnCreateSchema = z.object({
  sheet_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(COLUMN_TYPES).optional(),
  config: columnConfigSchema,
  position: z.number().optional(),
  width_px: z.number().int().min(40).max(1000).optional(),
})

const columnUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(COLUMN_TYPES).optional(),
  config: columnConfigSchema,
  position: z.number().optional(),
  width_px: z.number().int().min(40).max(1000).optional(),
})

const reorderSchema = z
  .object({
    sheet_id: z.string().uuid(),
    columns: z
      .array(z.object({ id: z.string().uuid(), position: z.number() }))
      .min(1)
      .optional(),
    ids: z.array(z.string().uuid()).min(1).optional(),
  })
  .refine((d) => Boolean(d.columns ?? d.ids), {
    message: 'columns or ids is required',
    path: ['columns'],
  })

const idParam = z.object({ id: z.string().uuid() })

interface ColumnRow {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  type: string
  config: Record<string, unknown>
  position: number
  width_px: number
}

interface SheetRow {
  id: string
  spreadsheet_id: string
  owner_id: string
}

async function ownedSheet(ownerId: string, sheetId: string): Promise<SheetRow | null> {
  return findOne<SheetRow>('sheets', [
    { field: 'id', operator: '=', value: sheetId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const sheetId = typeof req.query.sheet_id === 'string' ? req.query.sheet_id : null
    if (!sheetId) {
      res
        .status(400)
        .json({ error: t('validation.failed', {}, { defaultValue: 'sheet_id required' }) })
      return
    }
    if (!(await ownedSheet(ownerId, sheetId))) {
      res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
      return
    }
    const items = await findMany<ColumnRow>('columns', {
      where: [
        { field: 'sheet_id', operator: '=', value: sheetId },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('column.list', error)
    res
      .status(500)
      .json({ error: t('column.error.list', {}, { defaultValue: 'Failed to list columns' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const column = await findOne<ColumnRow>('columns', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!column) {
      res
        .status(404)
        .json({ error: t('column.notFound', {}, { defaultValue: 'Column not found' }) })
      return
    }
    res.json(column)
  } catch (error) {
    logger.error('column.read', error)
    res
      .status(500)
      .json({ error: t('column.error.read', {}, { defaultValue: 'Failed to read column' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = columnCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  const sheet = await ownedSheet(ownerId, parsed.data.sheet_id)
  if (!sheet) {
    res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
    return
  }
  try {
    const existing = await count('columns', [
      { field: 'sheet_id', operator: '=', value: parsed.data.sheet_id },
    ])
    const result = await create<ColumnRow>('columns', {
      sheet_id: parsed.data.sheet_id,
      spreadsheet_id: sheet.spreadsheet_id,
      owner_id: ownerId,
      name: parsed.data.name,
      type: parsed.data.type ?? 'text',
      config: parsed.data.config ?? {},
      position: parsed.data.position ?? existing,
      width_px: parsed.data.width_px ?? 180,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (result.data) {
      await safeBroadcast(`sheet:${parsed.data.sheet_id}`, 'column:created', result.data)
    }
    res.status(201).json(result.data)
  } catch (err) {
    console.error('[columns] create failed:', err)
    res
      .status(500)
      .json({ error: t('column.error.create', {}, { defaultValue: 'Failed to create column' }) })
  }
})

router.post('/reorder', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = reorderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  const sheet = await ownedSheet(ownerId, parsed.data.sheet_id)
  if (!sheet) {
    res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
    return
  }
  try {
    const items: Array<{ id: string; position: number }> =
      parsed.data.columns ?? (parsed.data.ids ?? []).map((id, i) => ({ id, position: i }))
    // Bind every client-supplied column id to the authorized sheet before
    // mutating — ownedSheet() only authorizes the PATH sheet, so without this
    // an owner of sheet A could renumber another sheet's columns by passing
    // their ids. Fetch this sheet's own columns once and ignore any foreign
    // id. [RVALL reorder IDOR]
    const owned = await findMany<{ id: string }>('columns', {
      where: [
        { field: 'sheet_id', operator: '=', value: parsed.data.sheet_id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
    })
    const validIds = new Set(owned.map((c) => String(c.id)))
    for (const item of items) {
      if (!validIds.has(String(item.id))) continue
      await updateById('columns', item.id, { position: item.position, updated_at: new Date() })
    }
    await safeBroadcast(`sheet:${parsed.data.sheet_id}`, 'columns:reordered', { columns: items })
    res.json({ reordered: true })
  } catch (error) {
    logger.error('column.reorder', error)
    res
      .status(500)
      .json({ error: t('column.error.reorder', {}, { defaultValue: 'Failed to reorder columns' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = columnUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<ColumnRow>('columns', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('column.notFound', {}, { defaultValue: 'Column not found' }) })
      return
    }
    const result = await updateById<ColumnRow>('columns', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    if (result.data) {
      await safeBroadcast(`sheet:${owned.sheet_id}`, 'column:updated', result.data)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('column.update', error)
    res
      .status(500)
      .json({ error: t('column.error.update', {}, { defaultValue: 'Failed to update column' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const owned = await findOne<ColumnRow>('columns', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('column.notFound', {}, { defaultValue: 'Column not found' }) })
      return
    }
    await deleteById('columns', id.data.id)
    await safeBroadcast(`sheet:${owned.sheet_id}`, 'column:deleted', { id: id.data.id })
    res.status(204).end()
  } catch (error) {
    logger.error('column.delete', error)
    res
      .status(500)
      .json({ error: t('column.error.delete', {}, { defaultValue: 'Failed to delete column' }) })
  }
})

export default router
