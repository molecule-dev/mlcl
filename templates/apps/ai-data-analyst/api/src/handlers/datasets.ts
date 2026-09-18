/**
 * Datasets handler — user-uploaded tabular datasets.
 *
 * Owns the dataset lifecycle: create from an upload reference, list /
 * read by id, query inferred columns + sample rows, delete. All by-id
 * operations scope by `user_id` for IDOR safety.
 *
 * The list and detail endpoints decorate the raw row with the shape
 * the frontend expects (`rows`, `cols`, `column_preview`, `schema`,
 * `statistics`, `ai_insights`) so DatasetCard / DatasetDetail can
 * render directly without reshape on the client.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { AiDataAnalystLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

// Enforce the per-tier `maxDatasets` cap (free=5) the pricing page advertises. Both create paths
// (POST / and POST /from_upload) persist a `datasets` row, so that count IS the user's usage —
// without it a free user stores unlimited datasets, breaking the paywall.
const enforceMaxDatasets = enforceLimit<AiDataAnalystLimits>({
  limitType: 'maxDatasets',
  getLimit: (limits) => limits.maxDatasets,
  getCurrent: async (userId) =>
    count('datasets', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const listQuerySchema = z.object({
  status: z.enum(['uploaded', 'profiling', 'ready', 'failed']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  format: z.enum(['csv', 'json', 'parquet', 'jsonl', 'xlsx']).optional(),
  source_url: z.string().optional(),
  row_count: z.number().int().nonnegative().optional(),
  col_count: z.number().int().nonnegative().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['uploaded', 'profiling', 'ready', 'failed']).optional(),
})

const previewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

interface DatasetRow {
  id?: string
  user_id?: string
  name?: string
  description?: string
  format?: string
  row_count?: number | string
  col_count?: number | string
  size_bytes?: number | string
  last_analyzed_at?: string | Date | null
  status?: string
  created_at?: string | Date | null
  updated_at?: string | Date | null
}

interface ColumnRow {
  id?: string
  dataset_id?: string
  name?: string
  type?: string
  nullable?: boolean
  unique_count?: number | string
  example?: string | null
  position?: number | string
  stats_json?: Record<string, unknown> | string | null
}

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

function num(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

/** Decorate a list-row with `rows` / `cols` / `column_preview` aliases. */
function decorateListRow(d: DatasetRow, columnNames: string[]): Record<string, unknown> {
  return {
    id: d.id,
    name: d.name ?? '',
    description: d.description ?? '',
    format: d.format ?? 'csv',
    rows: num(d.row_count),
    cols: num(d.col_count),
    size_bytes: num(d.size_bytes),
    last_analyzed_at: d.last_analyzed_at ?? null,
    status: d.status ?? 'uploaded',
    column_preview: columnNames,
  }
}

/** Decorate a detail-row with the full shape DatasetDetail.tsx expects. */
function decorateDetail(
  d: DatasetRow,
  columns: ColumnRow[],
  insights: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const schema = columns
    .slice()
    .sort((a, b) => num(a.position) - num(b.position))
    .map((c) => ({
      name: c.name ?? '',
      type: c.type ?? 'string',
      nullable: Boolean(c.nullable ?? true),
      unique_count: num(c.unique_count),
      example: c.example ?? '',
    }))

  const statistics = columns
    .slice()
    .sort((a, b) => num(a.position) - num(b.position))
    .map((c) => {
      const stats = decodeJson<{
        min?: string
        max?: string
        mean?: string
        median?: string
        null_pct?: number | string
      }>(c.stats_json, {})
      return {
        field: c.name ?? '',
        min: String(stats.min ?? '—'),
        max: String(stats.max ?? '—'),
        mean: stats.mean != null ? String(stats.mean) : undefined,
        median: stats.median != null ? String(stats.median) : undefined,
        null_pct: num(stats.null_pct),
      }
    })

  const ai_insights = insights.map((ix) => ({
    type: String(ix.kind ?? 'summary'),
    headline: String(ix.headline ?? ''),
    body: String(ix.body_md ?? ''),
  }))

  return {
    id: d.id,
    name: d.name ?? '',
    description: d.description ?? '',
    format: d.format ?? 'csv',
    rows: num(d.row_count),
    cols: num(d.col_count),
    size_bytes: num(d.size_bytes),
    last_analyzed_at: d.last_analyzed_at ?? null,
    status: d.status ?? 'uploaded',
    schema,
    statistics,
    ai_insights,
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  // Seed demo content on first list-load so users who land on /datasets
  // before /dashboard still see realistic content. Idempotent on user_id.
  try {
    await seedDemoForUser(userId)
  } catch (err) {
    console.warn('seedDemoForUser failed', err)
  }
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.status) {
    where.push({ field: 'status', operator: '=', value: String(req.query.status) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const datasets = await findMany<DatasetRow>('datasets', {
    where,
    orderBy: [{ field: 'updated_at', direction: 'desc' }],
    limit,
  })
  if (datasets.length === 0) return res.json([])

  // One batch query for column names per dataset, joined client-side so the
  // list endpoint stays a single round-trip even for many datasets.
  const ids = datasets.map((d) => d.id).filter(Boolean) as string[]
  const allColumns = await findMany<ColumnRow>('dataset_columns', {
    where: [{ field: 'dataset_id', operator: 'in', value: ids }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  const colsByDataset = new Map<string, string[]>()
  for (const c of allColumns) {
    const k = String(c.dataset_id ?? '')
    if (!colsByDataset.has(k)) colsByDataset.set(k, [])
    if (typeof c.name === 'string') colsByDataset.get(k)!.push(c.name)
  }

  res.json(datasets.map((d) => decorateListRow(d, colsByDataset.get(String(d.id ?? '')) ?? [])))
})

const fromUploadSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  filename: z.string().min(1).max(512),
  description: z.string().max(2000).optional(),
  format: z.enum(['csv', 'json', 'parquet', 'jsonl', 'xlsx']).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  columns: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        type: z.string().max(40).optional(),
        nullable: z.boolean().optional(),
        unique_count: z.number().int().nonnegative().optional(),
        example: z.string().max(1024).optional(),
        stats: z
          .object({
            min: z.union([z.string(), z.number()]).optional(),
            max: z.union([z.string(), z.number()]).optional(),
            mean: z.union([z.string(), z.number()]).optional(),
            median: z.union([z.string(), z.number()]).optional(),
            null_pct: z.number().optional(),
          })
          .optional(),
      }),
    )
    .min(1)
    .max(64),
  sample_rows: z.array(z.record(z.string(), z.unknown())).min(0).max(500),
})

/**
 * Ingest a client-parsed file: creates the dataset row, all dataset_columns,
 * and persists the sample_rows[] in dataset_rows so the Upload → Datasets
 * → DatasetDetail flow shows real schema + preview without ever streaming
 * bytes through this server.
 */
router.post(
  '/from_upload',
  enforceMaxDatasets,
  validateBody(fromUploadSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const body = req.body as z.infer<typeof fromUploadSchema>
    const inferredFormat: 'csv' | 'json' | 'parquet' | 'jsonl' | 'xlsx' =
      body.format ??
      (body.filename.endsWith('.csv')
        ? 'csv'
        : body.filename.endsWith('.parquet')
          ? 'parquet'
          : body.filename.endsWith('.jsonl')
            ? 'jsonl'
            : body.filename.endsWith('.xlsx')
              ? 'xlsx'
              : 'json')

    const datasetResult = await create<DatasetRow>('datasets', {
      user_id: userId,
      name: body.name ?? body.filename.replace(/\.[^.]+$/, ''),
      description: body.description ?? `Uploaded ${body.filename}`,
      format: inferredFormat,
      source_url: null,
      row_count: body.sample_rows.length,
      col_count: body.columns.length,
      size_bytes: body.size_bytes ?? 0,
      last_analyzed_at: new Date(),
      status: 'ready',
      metadata_json: JSON.stringify({ origin: 'upload', filename: body.filename }),
    })
    const dataset = (datasetResult as { data?: DatasetRow }).data ?? (datasetResult as DatasetRow)
    const datasetId = String(dataset.id ?? '')
    if (!datasetId) {
      return res.status(500).json({ error: t('errors.internalServer') })
    }

    for (let pos = 0; pos < body.columns.length; pos++) {
      const c = body.columns[pos]
      await create('dataset_columns', {
        dataset_id: datasetId,
        name: c.name,
        type: c.type ?? 'string',
        nullable: c.nullable ?? true,
        unique_count: c.unique_count ?? 0,
        example: c.example ?? '',
        position: pos,
        stats_json: JSON.stringify(c.stats ?? {}),
      })
    }

    for (let i = 0; i < body.sample_rows.length; i++) {
      await create('dataset_rows', {
        dataset_id: datasetId,
        row_index: i,
        values_json: JSON.stringify(body.sample_rows[i] ?? {}),
      })
    }

    // Also record an upload row so Upload.tsx → Recent uploads list reflects it.
    await create('uploads', {
      user_id: userId,
      filename: body.filename,
      mime: inferredFormat === 'csv' ? 'text/csv' : 'application/json',
      size_bytes: body.size_bytes ?? 0,
      s3_key: null,
      status: 'uploaded',
      uploaded_at: new Date(),
    })

    res.status(201).json(
      decorateListRow(
        dataset,
        body.columns.map((c) => c.name),
      ),
    )
  },
)

router.post(
  '/',
  enforceMaxDatasets,
  validateBody(createSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const body = req.body as z.infer<typeof createSchema>
    const result = await create<DatasetRow>('datasets', {
      user_id: userId,
      name: body.name,
      description: body.description ?? '',
      format: body.format ?? 'csv',
      source_url: body.source_url ?? null,
      row_count: body.row_count ?? 0,
      col_count: body.col_count ?? 0,
      size_bytes: body.size_bytes ?? 0,
      status: 'uploaded',
      metadata_json: JSON.stringify({}),
    })
    const persisted = (result as { data?: DatasetRow }).data ?? (result as DatasetRow)
    res.status(201).json(decorateListRow(persisted, []))
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<DatasetRow>('datasets', id)
  if (!row || row.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
  }
  const columns = await findMany<ColumnRow>('dataset_columns', {
    where: [{ field: 'dataset_id', operator: '=', value: id }],
    orderBy: [{ field: 'position', direction: 'asc' }],
  })
  const insights = await findMany<Record<string, unknown>>('insights', {
    where: [
      { field: 'dataset_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ],
    orderBy: [{ field: 'detected_at', direction: 'desc' }],
    limit: 8,
  })
  res.json(decorateDetail(row, columns, insights))
})

router.get(
  '/:id/preview',
  validateQuery(previewQuerySchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const id = getParamId(req, 'id')
    const dataset = await findById<DatasetRow>('datasets', id)
    if (!dataset || dataset.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
    }
    const limit = req.query.limit ? Number(req.query.limit) : 50
    const rows = await findMany<{
      row_index?: number | string
      values_json?: Record<string, unknown> | string | null
    }>('dataset_rows', {
      where: [{ field: 'dataset_id', operator: '=', value: id }],
      orderBy: [{ field: 'row_index', direction: 'asc' }],
      limit,
    })
    res.json(
      rows.map((r) => ({
        row_index: num(r.row_index),
        values: decodeJson<Record<string, unknown>>(r.values_json, {}),
      })),
    )
  },
)

router.put('/:id', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const dataset = await findById<DatasetRow>('datasets', id)
  if (!dataset || dataset.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
  }
  const body = req.body as z.infer<typeof updateSchema>
  const result = await updateById<DatasetRow>('datasets', id, {
    ...body,
    updated_at: new Date(),
  })
  const persisted = (result as { data?: DatasetRow }).data ?? (result as DatasetRow)
  res.json(decorateListRow(persisted, []))
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const dataset = await findById<DatasetRow>('datasets', id)
  if (!dataset || dataset.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
  }
  await deleteById('datasets', id)
  res.status(204).end()
})

export default router
