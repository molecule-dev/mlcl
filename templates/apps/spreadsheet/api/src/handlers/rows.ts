/**
 * Row handlers — owner-scoped CRUD for rows within a sheet, including
 * single-cell PATCH and batch insert/delete/reorder helpers used by the
 * grid editor and CSV importer.
 *
 * Authorization: every read/write filters by `owner_id = session.userId`.
 * For nested writes (e.g. `PATCH /rows/:id/cells/:columnId`), the row's
 * owner is verified before the cell merge is applied.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { safeBroadcast } from '../lib/safe-realtime.js'

const router = Router()

const cellsSchema = z.record(z.string(), z.unknown())

const rowCreateSchema = z.object({
  sheet_id: z.string().uuid(),
  cells: cellsSchema.optional(),
  position: z.number().optional(),
})

const rowUpdateSchema = z.object({
  cells: cellsSchema.optional(),
  position: z.number().optional(),
})

// PATCH /rows/:id/cells/:columnId — requires an explicit `value` key so a
// missing field is a 400 (e2e contract), but accepts any value type
// (string, number, boolean, null, JSON object) for cell content.
const cellPatchSchema = z
  .looseObject({})
  .refine((b) => Object.prototype.hasOwnProperty.call(b, 'value'), {
    message: 'value field is required',
  })
  .transform((b) => ({ value: (b as { value: unknown }).value }))

const batchCreateSchema = z.object({
  sheet_id: z.string().uuid(),
  rows: z
    .array(z.object({ cells: cellsSchema.optional() }))
    .min(1)
    .max(1000),
})

const batchDeleteSchema = z.object({
  sheet_id: z.string().uuid(),
  row_ids: z.array(z.string().uuid()).min(1).max(1000),
})

const reorderSchema = z
  .object({
    sheet_id: z.string().uuid(),
    rows: z
      .array(z.object({ id: z.string().uuid(), position: z.number() }))
      .min(1)
      .optional(),
    ids: z.array(z.string().uuid()).min(1).optional(),
  })
  .refine((d) => Boolean(d.rows ?? d.ids), {
    message: 'rows or ids is required',
    path: ['rows'],
  })

const idParam = z.object({ id: z.string().uuid() })
const cellParam = z.object({ id: z.string().uuid(), columnId: z.string().uuid() })

interface RowRecord {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  cells: Record<string, unknown>
  position: number
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
    const offset = Number(req.query.offset) || 0
    const limit = Math.min(Number(req.query.limit) || 100, 1000)
    const items = await findMany<RowRecord>('rows', {
      where: [
        { field: 'sheet_id', operator: '=', value: sheetId },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
      offset,
      limit,
    })
    res.json(items)
  } catch (error) {
    logger.error('row.list', error)
    res
      .status(500)
      .json({ error: t('row.error.list', {}, { defaultValue: 'Failed to list rows' }) })
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
    const row = await findOne<RowRecord>('rows', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!row) {
      res.status(404).json({ error: t('row.notFound', {}, { defaultValue: 'Row not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('row.read', error)
    res.status(500).json({ error: t('row.error.read', {}, { defaultValue: 'Failed to read row' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = rowCreateSchema.safeParse(req.body)
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
    const existing = await count('rows', [
      { field: 'sheet_id', operator: '=', value: parsed.data.sheet_id },
    ])
    const result = await create<RowRecord>('rows', {
      sheet_id: parsed.data.sheet_id,
      spreadsheet_id: sheet.spreadsheet_id,
      owner_id: ownerId,
      cells: parsed.data.cells ?? {},
      position: parsed.data.position ?? existing,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (result.data) {
      await safeBroadcast(`sheet:${parsed.data.sheet_id}`, 'row:created', result.data)
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('row.create', error)
    res
      .status(500)
      .json({ error: t('row.error.create', {}, { defaultValue: 'Failed to create row' }) })
  }
})

router.post('/batch', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = batchCreateSchema.safeParse(req.body)
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
    let position = await count('rows', [
      { field: 'sheet_id', operator: '=', value: parsed.data.sheet_id },
    ])
    const created: unknown[] = []
    for (const row of parsed.data.rows) {
      const result = await create<RowRecord>('rows', {
        sheet_id: parsed.data.sheet_id,
        spreadsheet_id: sheet.spreadsheet_id,
        owner_id: ownerId,
        cells: row.cells ?? {},
        position,
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (result.data) created.push(result.data)
      position++
    }
    await safeBroadcast(`sheet:${parsed.data.sheet_id}`, 'rows:batch-created', {
      count: created.length,
    })
    res.status(201).json(created)
  } catch (error) {
    logger.error('row.batch', error)
    res
      .status(500)
      .json({ error: t('row.error.batch', {}, { defaultValue: 'Failed to batch create rows' }) })
  }
})

router.post('/batch-delete', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = batchDeleteSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  if (!(await ownedSheet(ownerId, parsed.data.sheet_id))) {
    res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
    return
  }
  try {
    let removed = 0
    for (const id of parsed.data.row_ids) {
      const owned = await findOne<RowRecord>('rows', [
        { field: 'id', operator: '=', value: id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ])
      if (!owned) continue
      await deleteById('rows', id)
      removed++
    }
    await safeBroadcast(`sheet:${parsed.data.sheet_id}`, 'rows:batch-deleted', {
      row_ids: parsed.data.row_ids,
    })
    res.json({ deleted: removed })
  } catch (error) {
    logger.error('row.batchDelete', error)
    res
      .status(500)
      .json({ error: t('row.error.batchDelete', {}, { defaultValue: 'Failed to delete rows' }) })
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
  if (!(await ownedSheet(ownerId, parsed.data.sheet_id))) {
    res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
    return
  }
  try {
    const items: Array<{ id: string; position: number }> =
      parsed.data.rows ?? (parsed.data.ids ?? []).map((id, i) => ({ id, position: i }))
    for (const item of items) {
      const owned = await findOne<RowRecord>('rows', [
        { field: 'id', operator: '=', value: item.id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ])
      if (!owned) continue
      await updateById('rows', item.id, { position: item.position, updated_at: new Date() })
    }
    await safeBroadcast(`sheet:${parsed.data.sheet_id}`, 'rows:reordered', { rows: items })
    res.json({ reordered: true })
  } catch (error) {
    logger.error('row.reorder', error)
    res
      .status(500)
      .json({ error: t('row.error.reorder', {}, { defaultValue: 'Failed to reorder rows' }) })
  }
})

router.patch('/:id/cells/:columnId', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const params = cellParam.safeParse(req.params)
  const body = cellPatchSchema.safeParse(req.body)
  if (!params.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !params.success ? params.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<RowRecord>('rows', [
      { field: 'id', operator: '=', value: params.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('row.notFound', {}, { defaultValue: 'Row not found' }) })
      return
    }
    const cells = { ...owned.cells, [params.data.columnId]: body.data.value }
    const result = await updateById<RowRecord>('rows', params.data.id, {
      cells,
      updated_at: new Date(),
    })
    await safeBroadcast(`sheet:${owned.sheet_id}`, 'cell:updated', {
      row_id: params.data.id,
      column_id: params.data.columnId,
      value: body.data.value,
    })
    res.json(result.data)
  } catch (error) {
    logger.error('row.cell', error)
    res
      .status(500)
      .json({ error: t('row.error.cell', {}, { defaultValue: 'Failed to update cell' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = rowUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<RowRecord>('rows', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('row.notFound', {}, { defaultValue: 'Row not found' }) })
      return
    }
    const result = await updateById<RowRecord>('rows', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    if (result.data) {
      await safeBroadcast(`sheet:${owned.sheet_id}`, 'row:updated', result.data)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('row.update', error)
    res
      .status(500)
      .json({ error: t('row.error.update', {}, { defaultValue: 'Failed to update row' }) })
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
    const owned = await findOne<RowRecord>('rows', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('row.notFound', {}, { defaultValue: 'Row not found' }) })
      return
    }
    await deleteById('rows', id.data.id)
    await safeBroadcast(`sheet:${owned.sheet_id}`, 'row:deleted', { id: id.data.id })
    res.status(204).end()
  } catch (error) {
    logger.error('row.delete', error)
    res
      .status(500)
      .json({ error: t('row.error.delete', {}, { defaultValue: 'Failed to delete row' }) })
  }
})

export default router
