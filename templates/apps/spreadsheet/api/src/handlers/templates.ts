/**
 * Spreadsheet-template handlers — system + user templates with an
 * `instantiate` endpoint that copies the snapshot into a freshly-created
 * spreadsheet owned by the requester.
 *
 * `is_system = true` rows are the shared catalog: readable by everyone
 * but created ONLY by the seed migration / a server-controlled path
 * (`owner_id` NULL, `is_system` true). Clients can NEVER set `is_system`
 * — it is not part of the create/update schema, and user-created/edited
 * rows are always written `is_system: false`. This prevents a client from
 * injecting "official" templates into the global catalog (mass-assignment).
 * If admin-authored catalog templates ever become a requirement, gate
 * `is_system: true` behind a real role/tier authorizer (the app wires
 * `@molecule/api-entitlements`) — never a client boolean.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

// NOTE: `is_system` is deliberately NOT in this schema. It is a
// privileged flag for the shared catalog and must never be settable by a
// client (mass-assignment). System rows come only from the seed migration
// / a server-controlled path. See the module JSDoc above.
const templateCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  category: z.string().max(64).optional(),
  snapshot: z.record(z.string(), z.unknown()).optional(),
})

const templateUpdateSchema = templateCreateSchema.partial()

const idParam = z.object({ id: z.string().uuid() })

interface TemplateRow {
  id: string
  owner_id: string | null
  name: string
  description: string | null
  category: string | null
  is_system: boolean
  snapshot: Record<string, unknown>
}

interface SpreadsheetRow {
  id: string
  title: string
}

interface SheetSnap {
  name?: string
  position?: number
  color?: string | null
}

interface ColumnSnap {
  name?: string
  type?: string
  config?: Record<string, unknown>
  position?: number
  width_px?: number
  sheet_index?: number
}

interface RowSnap {
  cells?: Record<string, unknown>
  position?: number
  sheet_index?: number
}

router.get('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const where: WhereCondition[] = []
    if (req.query.system === 'true') {
      where.push({ field: 'is_system', operator: '=', value: true })
    } else {
      where.push({ field: 'owner_id', operator: '=', value: ownerId })
    }
    const items = await findMany<TemplateRow>('spreadsheet_templates', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('template.list', error)
    res
      .status(500)
      .json({ error: t('template.error.list', {}, { defaultValue: 'Failed to list templates' }) })
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
    const tpl = await findOne<TemplateRow>('spreadsheet_templates', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    if (!tpl.is_system && tpl.owner_id !== ownerId) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    res.json(tpl)
  } catch (error) {
    logger.error('template.read', error)
    res
      .status(500)
      .json({ error: t('template.error.read', {}, { defaultValue: 'Failed to read template' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = templateCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const result = await create<TemplateRow>('spreadsheet_templates', {
      owner_id: ownerId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      snapshot: parsed.data.snapshot ?? {},
      // Always false for client-created rows — the catalog flag is
      // server-controlled (seed migration), never client-settable.
      is_system: false,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('template.create', error)
    res.status(500).json({
      error: t('template.error.create', {}, { defaultValue: 'Failed to create template' }),
    })
  }
})

const instantiateSchema = z.object({
  title: z.string().min(1).max(255),
})

router.post('/:id/instantiate', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = instantiateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    // Templates are treated as a global gallery for instantiation purposes:
    // any authenticated user can spin a workbook off any template (the
    // resulting workbook is owned by the requester, not the template author).
    // Listing / editing remains owner-scoped via the `/` route.
    const tpl = await findOne<TemplateRow>('spreadsheet_templates', [
      { field: 'id', operator: '=', value: id.data.id },
    ])
    if (!tpl) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    const wsResult = await create<SpreadsheetRow>('spreadsheets', {
      owner_id: ownerId,
      title: body.data.title,
      description: tpl.description,
      is_public: false,
      public_slug: null,
      is_starred: false,
      trashed_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const newWb = wsResult.data
    if (!newWb) {
      res.status(500).json({
        error: t('template.error.instantiate', {}, { defaultValue: 'Failed to instantiate' }),
      })
      return
    }
    type NestedSheetSnap = SheetSnap & { columns?: ColumnSnap[]; rows?: RowSnap[] }
    const snap = tpl.snapshot as {
      sheets?: NestedSheetSnap[]
      columns?: ColumnSnap[]
      rows?: RowSnap[]
    }
    const sheets = snap.sheets ?? [{ name: 'Sheet 1', position: 0, color: null }]
    const sheetIds: string[] = []
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i]!
      const sheetResult = await create<{ id: string }>('sheets', {
        spreadsheet_id: newWb.id,
        owner_id: ownerId,
        name: s.name ?? `Sheet ${i + 1}`,
        position: s.position ?? i,
        color: s.color ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      if (sheetResult.data) sheetIds.push(sheetResult.data.id)
    }
    // Nested per-sheet columns / rows from the template snapshot.
    for (let i = 0; i < sheets.length; i++) {
      const s = sheets[i]!
      const targetSheet = sheetIds[i]
      if (!targetSheet) continue
      const cols = s.columns ?? []
      for (let j = 0; j < cols.length; j++) {
        const col = cols[j]!
        await create('columns', {
          sheet_id: targetSheet,
          spreadsheet_id: newWb.id,
          owner_id: ownerId,
          name: col.name ?? `Column ${j + 1}`,
          type: col.type ?? 'text',
          config: col.config ?? {},
          position: col.position ?? j,
          width_px: col.width_px ?? 180,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
      const rowSnap = s.rows ?? []
      for (let j = 0; j < rowSnap.length; j++) {
        const row = rowSnap[j]!
        await create('rows', {
          sheet_id: targetSheet,
          spreadsheet_id: newWb.id,
          owner_id: ownerId,
          cells: row.cells ?? {},
          position: row.position ?? j,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
    // Top-level snap.columns / snap.rows (alternative flat shape).
    for (const col of snap.columns ?? []) {
      const targetSheet = sheetIds[col.sheet_index ?? 0]
      if (!targetSheet) continue
      await create('columns', {
        sheet_id: targetSheet,
        spreadsheet_id: newWb.id,
        owner_id: ownerId,
        name: col.name ?? 'Column',
        type: col.type ?? 'text',
        config: col.config ?? {},
        position: col.position ?? 0,
        width_px: col.width_px ?? 180,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    for (const row of snap.rows ?? []) {
      const targetSheet = sheetIds[row.sheet_index ?? 0]
      if (!targetSheet) continue
      await create('rows', {
        sheet_id: targetSheet,
        spreadsheet_id: newWb.id,
        owner_id: ownerId,
        cells: row.cells ?? {},
        position: row.position ?? 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
    }
    res.status(201).json({ id: newWb.id, title: newWb.title, template_id: tpl.id })
  } catch (error) {
    logger.error('template.instantiate', error)
    res.status(500).json({
      error: t(
        'template.error.instantiate',
        {},
        { defaultValue: 'Failed to instantiate template' },
      ),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = templateUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<TemplateRow>('spreadsheet_templates', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    // `body.data` cannot carry `is_system` — it is not in templateUpdateSchema
    // (zod strips unknown keys), so the privileged catalog flag can never be
    // mass-assigned through this spread.
    const result = await updateById<TemplateRow>('spreadsheet_templates', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('template.update', error)
    res.status(500).json({
      error: t('template.error.update', {}, { defaultValue: 'Failed to update template' }),
    })
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
    const owned = await findOne<TemplateRow>('spreadsheet_templates', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res
        .status(404)
        .json({ error: t('template.notFound', {}, { defaultValue: 'Template not found' }) })
      return
    }
    await deleteById('spreadsheet_templates', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('template.delete', error)
    res.status(500).json({
      error: t('template.error.delete', {}, { defaultValue: 'Failed to delete template' }),
    })
  }
})

export default router
