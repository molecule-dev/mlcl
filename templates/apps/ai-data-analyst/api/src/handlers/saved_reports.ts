/**
 * Saved-reports handler — user-curated analytical reports.
 *
 * List endpoint emits the `ReportThumbnailData` shape: id, title,
 * description, chart_type, schedule, shared_with, last_run_at,
 * thumbnail_series. Detail endpoint emits the `ReportDetail` shape:
 * id, title, description, hero, kpis, sub_charts, ai_summary,
 * data_table.
 *
 * The list/detail projection lives in `metadata_json` (rich) +
 * `layout_json` (display preferences). The seed handler populates both;
 * runtime mutations preserve them.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface SavedReportRow {
  id?: string
  user_id?: string
  title?: string
  description?: string
  dataset_id?: string | null
  layout_json?: Record<string, unknown> | string | null
  metadata_json?: Record<string, unknown> | string | null
  last_run_at?: string | Date | null
  created_at?: string | Date | null
  updated_at?: string | Date | null
}

const listQuerySchema = z.object({
  dataset_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dataset_id: z.string().nullable().optional(),
  layout: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dataset_id: z.string().nullable().optional(),
  layout: z.array(z.record(z.string(), z.unknown())).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

function decodeJson<T>(v: unknown, fallback: T): T {
  if (!v) return fallback
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T
    } catch (_error) {
      // Malformed JSON string — return the fallback value
      return fallback
    }
  }
  if (typeof v === 'object') return v as T
  return fallback
}

function decorateThumbnail(r: SavedReportRow): Record<string, unknown> {
  const layout = decodeJson<{
    schedule?: 'daily' | 'weekly' | 'monthly' | null
    shared_with?: string[]
    thumbnail_series?: number[]
    chart_type?: 'bar' | 'line' | 'scatter' | 'heatmap' | 'pie' | 'table'
  }>(r.layout_json, {})
  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? '',
    chart_type: layout.chart_type ?? 'bar',
    schedule: layout.schedule ?? null,
    shared_with: Array.isArray(layout.shared_with) ? layout.shared_with : [],
    last_run_at: r.last_run_at ?? r.updated_at ?? r.created_at ?? new Date().toISOString(),
    thumbnail_series: Array.isArray(layout.thumbnail_series)
      ? layout.thumbnail_series
      : [4, 6, 9, 14, 18, 22, 28, 32],
  }
}

function decorateDetail(r: SavedReportRow): Record<string, unknown> {
  const meta = decodeJson<{
    hero?: { type: 'bar' | 'line'; series: { label: string; value: number }[] }
    kpis?: { label: string; value: string; delta_pct?: number }[]
    sub_charts?: { title: string; series: { label: string; value: number }[]; color: string }[]
    ai_summary?: string
    data_table?: { col: string; values: (string | number)[] }[]
  }>(r.metadata_json, {})
  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? '',
    hero: meta.hero ?? { type: 'bar', series: [] },
    kpis: meta.kpis ?? [],
    sub_charts: meta.sub_charts ?? [],
    ai_summary: meta.ai_summary ?? '',
    data_table: meta.data_table ?? [],
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.dataset_id) {
    where.push({ field: 'dataset_id', operator: '=', value: String(req.query.dataset_id) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const rows = await findMany<SavedReportRow>('saved_reports', {
    where,
    orderBy: [{ field: 'last_run_at', direction: 'desc' }],
    limit,
  })
  res.json(rows.map(decorateThumbnail))
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createSchema>
  const result = await create<SavedReportRow>('saved_reports', {
    user_id: userId,
    title: body.title,
    description: body.description ?? '',
    dataset_id: body.dataset_id ?? null,
    layout_json: JSON.stringify(body.layout ?? []),
    metadata_json: JSON.stringify(body.metadata ?? {}),
    last_run_at: new Date(),
  })
  const persisted = (result as { data?: SavedReportRow }).data ?? (result as SavedReportRow)
  res.status(201).json(decorateDetail(persisted))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<SavedReportRow>('saved_reports', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  res.json(decorateDetail(row))
})

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<SavedReportRow>('saved_reports', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  const body = req.body as z.infer<typeof updateSchema>
  const patch: Record<string, unknown> = { updated_at: new Date() }
  if (body.title !== undefined) patch.title = body.title
  if (body.description !== undefined) patch.description = body.description
  if (body.dataset_id !== undefined) patch.dataset_id = body.dataset_id
  if (body.layout !== undefined) patch.layout_json = JSON.stringify(body.layout)
  if (body.metadata !== undefined) patch.metadata_json = JSON.stringify(body.metadata)
  const result = await updateById<SavedReportRow>('saved_reports', id, patch)
  const persisted = (result as { data?: SavedReportRow }).data ?? (result as SavedReportRow)
  res.json(decorateDetail(persisted))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<SavedReportRow>('saved_reports', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  await deleteById('saved_reports', id)
  res.status(204).end()
})

export default router
