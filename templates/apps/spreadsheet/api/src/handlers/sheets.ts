/**
 * Sheet handlers — owner-scoped CRUD for tabs within a spreadsheet.
 *
 * Sheets inherit ownership from their parent spreadsheet; every mutation
 * looks the parent up under owner_id before touching the child row, so
 * non-owners cannot enumerate, mutate, or reorder another workbook's
 * tabs.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { safeBroadcast } from '../lib/safe-realtime.js'

const router = Router()

const sheetCreateSchema = z.object({
  spreadsheet_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  position: z.number().optional(),
  color: z.string().max(32).nullable().optional(),
})

const sheetUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  position: z.number().optional(),
  color: z.string().max(32).nullable().optional(),
})

const reorderSchema = z.object({
  spreadsheet_id: z.string().uuid(),
  sheets: z.array(z.object({ id: z.string().uuid(), position: z.number() })).min(1),
})

const idParam = z.object({ id: z.string().uuid() })

interface SheetRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  position: number
  color: string | null
}

interface SpreadsheetRow {
  id: string
  owner_id: string
}

async function ensureOwnsSpreadsheet(ownerId: string, spreadsheetId: string): Promise<boolean> {
  const ws = await findOne<SpreadsheetRow>('spreadsheets', [
    { field: 'id', operator: '=', value: spreadsheetId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  return ws !== null
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const spreadsheetId =
      typeof req.query.spreadsheet_id === 'string' ? req.query.spreadsheet_id : null
    if (!spreadsheetId) {
      res
        .status(400)
        .json({ error: t('validation.failed', {}, { defaultValue: 'spreadsheet_id required' }) })
      return
    }
    if (!(await ensureOwnsSpreadsheet(ownerId, spreadsheetId))) {
      res
        .status(404)
        .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
      return
    }
    const items = await findMany<SheetRow>('sheets', {
      where: [
        { field: 'spreadsheet_id', operator: '=', value: spreadsheetId },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('sheet.list', error)
    res
      .status(500)
      .json({ error: t('sheet.error.list', {}, { defaultValue: 'Failed to list sheets' }) })
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
    const sheet = await findOne<SheetRow>('sheets', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!sheet) {
      res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
      return
    }
    res.json(sheet)
  } catch (error) {
    logger.error('sheet.read', error)
    res
      .status(500)
      .json({ error: t('sheet.error.read', {}, { defaultValue: 'Failed to read sheet' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = sheetCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  if (!(await ensureOwnsSpreadsheet(ownerId, parsed.data.spreadsheet_id))) {
    res
      .status(404)
      .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
    return
  }
  try {
    const existing = await count('sheets', [
      { field: 'spreadsheet_id', operator: '=', value: parsed.data.spreadsheet_id },
    ])
    const result = await create<SheetRow>('sheets', {
      spreadsheet_id: parsed.data.spreadsheet_id,
      owner_id: ownerId,
      name: parsed.data.name,
      position: parsed.data.position ?? existing,
      color: parsed.data.color ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (result.data) {
      await safeBroadcast(`spreadsheet:${parsed.data.spreadsheet_id}`, 'sheet:created', result.data)
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('sheet.create', error)
    res
      .status(500)
      .json({ error: t('sheet.error.create', {}, { defaultValue: 'Failed to create sheet' }) })
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
  if (!(await ensureOwnsSpreadsheet(ownerId, parsed.data.spreadsheet_id))) {
    res
      .status(404)
      .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
    return
  }
  try {
    // Bind every client-supplied sheet id to the authorized spreadsheet before
    // mutating — ensureOwnsSpreadsheet() only authorizes the PATH spreadsheet,
    // so without this an owner of workbook A could renumber another workbook's
    // sheets by passing their ids. Fetch this spreadsheet's own sheets once and
    // ignore any foreign id. [RVALL reorder IDOR]
    const owned = await findMany<{ id: string }>('sheets', {
      where: [
        { field: 'spreadsheet_id', operator: '=', value: parsed.data.spreadsheet_id },
        { field: 'owner_id', operator: '=', value: ownerId },
      ],
    })
    const validIds = new Set(owned.map((s) => String(s.id)))
    for (const item of parsed.data.sheets) {
      if (!validIds.has(String(item.id))) continue
      await updateById('sheets', item.id, { position: item.position, updated_at: new Date() })
    }
    await safeBroadcast(`spreadsheet:${parsed.data.spreadsheet_id}`, 'sheets:reordered', {
      sheets: parsed.data.sheets,
    })
    res.json({ reordered: true })
  } catch (error) {
    logger.error('sheet.reorder', error)
    res
      .status(500)
      .json({ error: t('sheet.error.reorder', {}, { defaultValue: 'Failed to reorder sheets' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = sheetUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<SheetRow>('sheets', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
      return
    }
    const result = await updateById<SheetRow>('sheets', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    if (result.data) {
      await safeBroadcast(`spreadsheet:${owned.spreadsheet_id}`, 'sheet:updated', result.data)
    }
    res.json(result.data)
  } catch (error) {
    logger.error('sheet.update', error)
    res
      .status(500)
      .json({ error: t('sheet.error.update', {}, { defaultValue: 'Failed to update sheet' }) })
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
    const owned = await findOne<SheetRow>('sheets', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
      return
    }
    await deleteById('sheets', id.data.id)
    await safeBroadcast(`spreadsheet:${owned.spreadsheet_id}`, 'sheet:deleted', { id: id.data.id })
    res.status(204).end()
  } catch (error) {
    logger.error('sheet.delete', error)
    res
      .status(500)
      .json({ error: t('sheet.error.delete', {}, { defaultValue: 'Failed to delete sheet' }) })
  }
})

export default router
