/**
 * CSV import/export handlers for spreadsheets.
 *
 * Import: parse a CSV body and insert rows + auto-create columns from
 * the header row when the sheet is empty. Owner-scoped.
 *
 * Export: stream a sheet as CSV using `@molecule/api-import-export-csv`.
 *
 * Both routes are mounted under `/api` (not `/api/spreadsheets`) so the
 * paths match the INVENTORY user-flow contract:
 *
 *   POST /api/spreadsheets/:id/import
 *   GET  /api/spreadsheets/:id/export
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { count, create, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * NOTE: `@molecule/api-import-export` is table-oriented (give it a table
 * name, get a Buffer back). Spreadsheet rows are denormalised cell maps
 * keyed by column id, so we serialise locally with `parseCsvText` /
 * `serializeCsv` below — the bond is still wired in `bonds.ts` for any
 * generic table export, just not appropriate for cell-shaped data.
 */

const router = Router()

const importBodySchema = z
  .object({
    format: z.enum(['csv']).default('csv').optional(),
    sheet_id: z.string().uuid().optional(),
    sheet_name: z.string().min(1).max(255).optional(),
    csv: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.csv ?? d.content), {
    message: 'csv or content is required',
    path: ['content'],
  })
  .refine((d) => Boolean(d.sheet_id ?? d.sheet_name), {
    message: 'sheet_id or sheet_name is required',
    path: ['sheet_id'],
  })

const idParam = z.object({ id: z.string().uuid() })

interface SpreadsheetRow {
  id: string
  owner_id: string
}

interface SheetRow {
  id: string
  spreadsheet_id: string
  owner_id: string
}

interface ColumnRow {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  position: number
}

interface RowRecord {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  cells: Record<string, unknown>
  position: number
}

router.post('/spreadsheets/:id/import', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = importBodySchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  const ws = await findOne<SpreadsheetRow>('spreadsheets', [
    { field: 'id', operator: '=', value: id.data.id },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  if (!ws) {
    res
      .status(404)
      .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
    return
  }
  let sheet: SheetRow | null
  if (body.data.sheet_id) {
    sheet = await findOne<SheetRow>('sheets', [
      { field: 'id', operator: '=', value: body.data.sheet_id },
      { field: 'spreadsheet_id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!sheet) {
      res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
      return
    }
  } else if (body.data.sheet_name) {
    const position = await count('sheets', [
      { field: 'spreadsheet_id', operator: '=', value: id.data.id },
    ])
    const created = await create<SheetRow>('sheets', {
      spreadsheet_id: id.data.id,
      owner_id: ownerId,
      name: body.data.sheet_name,
      position,
      created_at: new Date(),
      updated_at: new Date(),
    })
    sheet = created.data ?? null
    if (!sheet) {
      res
        .status(500)
        .json({ error: t('importExport.error.import', {}, { defaultValue: 'Import failed' }) })
      return
    }
  } else {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'sheet_id or sheet_name is required' }),
    })
    return
  }
  try {
    const csv = body.data.csv ?? body.data.content
    if (!csv) {
      res.status(400).json({
        error: t('importExport.error.csvRequired', {}, { defaultValue: 'csv body is required' }),
      })
      return
    }
    const parsed = parseCsvText(csv)
    const existingColumns = await findMany<ColumnRow>('columns', {
      where: [{ field: 'sheet_id', operator: '=', value: sheet.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const headerToColumnId = new Map<string, string>()
    for (const col of existingColumns) headerToColumnId.set(col.name, col.id)
    let nextColumnPosition = existingColumns.length
    for (const header of parsed.headers) {
      if (headerToColumnId.has(header)) continue
      const result = await create<ColumnRow>('columns', {
        sheet_id: sheet.id,
        spreadsheet_id: sheet.spreadsheet_id,
        owner_id: ownerId,
        name: header,
        type: 'text',
        config: {},
        position: nextColumnPosition,
        width_px: 180,
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (result.data) headerToColumnId.set(header, result.data.id)
      nextColumnPosition++
    }
    let rowPosition = await count('rows', [{ field: 'sheet_id', operator: '=', value: sheet.id }])
    let imported = 0
    for (const row of parsed.rows) {
      const cells: Record<string, unknown> = {}
      for (const [header, value] of Object.entries(row)) {
        const colId = headerToColumnId.get(header)
        if (colId) cells[colId] = value
      }
      await create<RowRecord>('rows', {
        sheet_id: sheet.id,
        spreadsheet_id: sheet.spreadsheet_id,
        owner_id: ownerId,
        cells,
        position: rowPosition,
        created_at: new Date(),
        updated_at: new Date(),
      })
      rowPosition++
      imported++
    }
    res.json({ imported, columns: nextColumnPosition })
  } catch (error) {
    logger.error('importExport.import', error)
    res
      .status(500)
      .json({ error: t('importExport.error.import', {}, { defaultValue: 'Import failed' }) })
  }
})

router.get('/spreadsheets/:id/export', async (req: Request, res: Response) => {
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
  const sheetId = typeof req.query.sheet_id === 'string' ? req.query.sheet_id : null
  if (!sheetId) {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'sheet_id query required' }) })
    return
  }
  const formatRaw = typeof req.query.format === 'string' ? req.query.format : 'csv'
  if (formatRaw !== 'csv') {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'unsupported export format' }) })
    return
  }
  const ws = await findOne<SpreadsheetRow>('spreadsheets', [
    { field: 'id', operator: '=', value: id.data.id },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  if (!ws) {
    res
      .status(404)
      .json({ error: t('spreadsheet.notFound', {}, { defaultValue: 'Spreadsheet not found' }) })
    return
  }
  const sheet = await findOne<SheetRow>('sheets', [
    { field: 'id', operator: '=', value: sheetId },
    { field: 'spreadsheet_id', operator: '=', value: id.data.id },
    { field: 'owner_id', operator: '=', value: ownerId },
  ])
  if (!sheet) {
    res.status(404).json({ error: t('sheet.notFound', {}, { defaultValue: 'Sheet not found' }) })
    return
  }
  try {
    const columns = await findMany<ColumnRow>('columns', {
      where: [{ field: 'sheet_id', operator: '=', value: sheet.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const rows = await findMany<RowRecord>('rows', {
      where: [{ field: 'sheet_id', operator: '=', value: sheet.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    const headers = columns.map((c) => c.name)
    const flatRows = rows.map((r) => {
      const out: Record<string, unknown> = {}
      for (const col of columns) {
        out[col.name] = r.cells[col.id] ?? ''
      }
      return out
    })
    const csvText = serializeCsv(headers, flatRows)
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${sheetId}.csv"`)
    res.send(csvText)
  } catch (error) {
    logger.error('importExport.export', error)
    res
      .status(500)
      .json({ error: t('importExport.error.export', {}, { defaultValue: 'Export failed' }) })
  }
})

function parseCsvText(text: string): { headers: string[]; rows: Array<Record<string, unknown>> } {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      cur.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      cur.push(field)
      rows.push(cur)
      cur = []
      field = ''
    } else {
      field += ch
    }
  }
  if (field.length > 0 || cur.length > 0) {
    cur.push(field)
    rows.push(cur)
  }
  const headers = (rows.shift() ?? []).map((h) => h.trim())
  const dataRows = rows
    .filter((r) => r.length && !(r.length === 1 && r[0] === ''))
    .map((r) => {
      const out: Record<string, unknown> = {}
      for (let i = 0; i < headers.length; i++) out[headers[i]!] = r[i] ?? ''
      return out
    })
  return { headers, rows: dataRows }
}

function serializeCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const escape = (v: unknown): string => {
    let s = v == null ? '' : String(v)
    // [L2-1] Neutralize CSV/formula injection (CWE-1236): a cell starting with = + - @ or a
    // leading tab/CR is executed as a formula by Excel/Sheets/LibreOffice. Prefix a single
    // quote (the standard text marker, stripped on display) BEFORE RFC-4180 quoting; genuine
    // numbers are exempt so negative values aren't mangled (mirrors the shared csv escapeField).
    // Cells here are plain stored strings (no in-app formula engine), so this is pure export
    // hardening — a collaborator's injected cell can't attack the owner who exports + opens it.
    if (!/^-?\d+(\.\d+)?$/.test(s) && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.map(escape).join(',')]
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','))
  }
  return lines.join('\n')
}

export default router
