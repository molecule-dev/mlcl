/**
 * Chart handlers — owner-scoped CRUD for chart definitions saved on a
 * sheet. The `config` jsonb stores axis column refs, series labels, and
 * options consumed by `@molecule/app-chart-wrapper-react` on the
 * frontend.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, deleteById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

const CHART_TYPES = ['line', 'bar', 'pie', 'scatter', 'area'] as const

const chartCreateSchema = z.object({
  sheet_id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(CHART_TYPES),
  config: z.record(z.string(), z.unknown()).optional(),
})

const chartUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(CHART_TYPES).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
})

const idParam = z.object({ id: z.string().uuid() })

interface ChartRow {
  id: string
  sheet_id: string
  spreadsheet_id: string
  owner_id: string
  name: string
  type: string
  config: Record<string, unknown>
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
    const where = [{ field: 'owner_id', operator: '=', value: ownerId }] as Array<{
      field: string
      operator: '='
      value: unknown
    }>
    if (typeof req.query.sheet_id === 'string') {
      where.push({ field: 'sheet_id', operator: '=', value: req.query.sheet_id })
    }
    if (typeof req.query.spreadsheet_id === 'string') {
      where.push({ field: 'spreadsheet_id', operator: '=', value: req.query.spreadsheet_id })
    }
    const items = await findMany<ChartRow>('chart_definitions', {
      where,
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('chart.list', error)
    res
      .status(500)
      .json({ error: t('chart.error.list', {}, { defaultValue: 'Failed to list charts' }) })
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
    const row = await findOne<ChartRow>('chart_definitions', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!row) {
      res.status(404).json({ error: t('chart.notFound', {}, { defaultValue: 'Chart not found' }) })
      return
    }
    res.json(row)
  } catch (error) {
    logger.error('chart.read', error)
    res
      .status(500)
      .json({ error: t('chart.error.read', {}, { defaultValue: 'Failed to read chart' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = chartCreateSchema.safeParse(req.body)
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
    const result = await create<ChartRow>('chart_definitions', {
      sheet_id: parsed.data.sheet_id,
      spreadsheet_id: sheet.spreadsheet_id,
      owner_id: ownerId,
      name: parsed.data.name,
      type: parsed.data.type,
      config: parsed.data.config ?? {},
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('chart.create', error)
    res
      .status(500)
      .json({ error: t('chart.error.create', {}, { defaultValue: 'Failed to create chart' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = chartUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<ChartRow>('chart_definitions', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('chart.notFound', {}, { defaultValue: 'Chart not found' }) })
      return
    }
    const result = await updateById<ChartRow>('chart_definitions', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (error) {
    logger.error('chart.update', error)
    res
      .status(500)
      .json({ error: t('chart.error.update', {}, { defaultValue: 'Failed to update chart' }) })
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
    const owned = await findOne<ChartRow>('chart_definitions', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('chart.notFound', {}, { defaultValue: 'Chart not found' }) })
      return
    }
    await deleteById('chart_definitions', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('chart.delete', error)
    res
      .status(500)
      .json({ error: t('chart.error.delete', {}, { defaultValue: 'Failed to delete chart' }) })
  }
})

export default router
