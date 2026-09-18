/**
 * Version-history handlers — append-only snapshots per spreadsheet, with
 * a `restore` endpoint that overwrites the live sheets/columns/rows from
 * a chosen snapshot.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteMany, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { safeBroadcast } from '../lib/safe-realtime.js'

const router = Router()

const versionCreateSchema = z.object({
  spreadsheet_id: z.string().uuid(),
  snapshot: z.record(z.string(), z.unknown()).optional(),
  change_summary: z.string().max(255).optional(),
})

const restoreParam = z.object({ id: z.string().uuid() })
const idParam = z.object({ id: z.string().uuid() })

interface VersionRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  created_by: string
  snapshot: Record<string, unknown>
  change_summary: string | null
  created_at: string
}

interface SpreadsheetRow {
  id: string
  owner_id: string
}

interface SheetRow {
  id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  position: number
  color: string | null
}

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

interface RowData {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  cells: Record<string, unknown>
  position: number
}

async function ownsSpreadsheet(
  ownerId: string,
  spreadsheetId: string,
): Promise<SpreadsheetRow | null> {
  return findOne<SpreadsheetRow>('spreadsheets', [
    { field: 'id', operator: '=', value: spreadsheetId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
}

async function captureSnapshot(spreadsheetId: string): Promise<Record<string, unknown>> {
  const sheets = await findMany<SheetRow>('sheets', {
    where: [{ field: 'spreadsheet_id', operator: '=', value: spreadsheetId }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  const columns = await findMany<ColumnRow>('columns', {
    where: [{ field: 'spreadsheet_id', operator: '=', value: spreadsheetId }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  const rows = await findMany<RowData>('rows', {
    where: [{ field: 'spreadsheet_id', operator: '=', value: spreadsheetId }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  return { sheets, columns, rows }
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const where = [{ field: 'owner_id', operator: '=', value: ownerId }] as Array<{
      field: string
      operator: '='
      value: unknown
    }>
    if (typeof req.query.spreadsheet_id === 'string') {
      where.push({ field: 'spreadsheet_id', operator: '=', value: req.query.spreadsheet_id })
    }
    const items = await findMany<VersionRow>('spreadsheet_versions', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('version.list', error)
    res
      .status(500)
      .json({ error: t('version.error.list', {}, { defaultValue: 'Failed to list versions' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = versionCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  if (!(await ownsSpreadsheet(ownerId, parsed.data.spreadsheet_id))) {
    res
      .status(404)
      .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
    return
  }
  try {
    const snapshot = parsed.data.snapshot ?? (await captureSnapshot(parsed.data.spreadsheet_id))
    const result = await create<VersionRow>('spreadsheet_versions', {
      spreadsheet_id: parsed.data.spreadsheet_id,
      owner_id: ownerId,
      created_by: ownerId,
      snapshot,
      change_summary: parsed.data.change_summary ?? null,
      created_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('version.create', error)
    res
      .status(500)
      .json({ error: t('version.error.create', {}, { defaultValue: 'Failed to create version' }) })
  }
})

router.post('/:id/restore', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = restoreParam.safeParse(req.params)
  if (!id.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: id.error.issues,
    })
    return
  }
  try {
    const version = await findOne<VersionRow>('spreadsheet_versions', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!version) {
      res
        .status(404)
        .json({ error: t('version.notFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    const snap = version.snapshot as {
      sheets?: SheetRow[]
      columns?: ColumnRow[]
      rows?: RowData[]
    }
    // Wipe live state, then re-insert from snapshot. ON DELETE CASCADE on
    // sheets removes columns + rows automatically; we then re-create from
    // the snapshot in lexical order.
    await deleteMany('rows', [
      { field: 'spreadsheet_id', operator: '=', value: version.spreadsheet_id },
    ])
    await deleteMany('columns', [
      { field: 'spreadsheet_id', operator: '=', value: version.spreadsheet_id },
    ])
    await deleteMany('sheets', [
      { field: 'spreadsheet_id', operator: '=', value: version.spreadsheet_id },
    ])
    for (const sheet of snap.sheets ?? []) {
      await create('sheets', {
        ...sheet,
        owner_id: ownerId,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    for (const column of snap.columns ?? []) {
      await create('columns', {
        ...column,
        owner_id: ownerId,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    for (const row of snap.rows ?? []) {
      await create('rows', {
        ...row,
        owner_id: ownerId,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    await safeBroadcast(`spreadsheet:${version.spreadsheet_id}`, 'spreadsheet:restored', {
      version_id: version.id,
    })
    res.json({ restored: true, version_id: version.id })
  } catch (error) {
    logger.error('version.restore', error)
    res.status(500).json({
      error: t('version.error.restore', {}, { defaultValue: 'Failed to restore version' }),
    })
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
    const version = await findOne<VersionRow>('spreadsheet_versions', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!version) {
      res
        .status(404)
        .json({ error: t('version.notFound', {}, { defaultValue: 'Version not found' }) })
      return
    }
    res.json(version)
  } catch (error) {
    logger.error('version.read', error)
    res
      .status(500)
      .json({ error: t('version.error.read', {}, { defaultValue: 'Failed to read version' }) })
  }
})

export default router
