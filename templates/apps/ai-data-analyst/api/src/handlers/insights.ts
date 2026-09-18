/**
 * Insights handler — precomputed AI observations attached to a dataset.
 *
 * The list endpoint decorates each row with the `InsightCardData` shape
 * the Dashboard / InsightsFeed components expect:
 *   { id, type, headline, body, dataset_name, href, detected_at }
 *
 * Where:
 * - `type`         is the DB column `kind`
 * - `body`         is the DB column `body_md`
 * - `dataset_name` is joined from `datasets`
 * - `href`         is `/datasets/{dataset_id}`
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

const listQuerySchema = z.object({
  dataset_id: z.string().optional(),
  kind: z.enum(['anomaly', 'correlation', 'trend', 'outlier', 'summary']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

const createSchema = z.object({
  dataset_id: z.string().min(1),
  kind: z.enum(['anomaly', 'correlation', 'trend', 'outlier', 'summary']),
  headline: z.string().min(1),
  body_md: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

interface InsightRow {
  id?: string
  user_id?: string
  dataset_id?: string
  kind?: string
  headline?: string
  body_md?: string
  confidence?: number | string | null
  detected_at?: string | Date | null
  created_at?: string | Date | null
}

function mapKindToType(kind: string | undefined): 'trend' | 'anomaly' | 'correlation' | 'summary' {
  switch (kind) {
    case 'trend':
      return 'trend'
    case 'anomaly':
      return 'anomaly'
    case 'outlier':
      return 'anomaly'
    case 'correlation':
      return 'correlation'
    default:
      return 'summary'
  }
}

function decorate(row: InsightRow, datasetName: string): Record<string, unknown> {
  return {
    id: row.id,
    type: mapKindToType(row.kind),
    headline: row.headline ?? '',
    body: row.body_md ?? '',
    dataset_name: datasetName,
    href: row.dataset_id ? `/datasets/${row.dataset_id}` : '#',
    detected_at: row.detected_at ?? row.created_at ?? new Date().toISOString(),
  }
}

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  await seedDemoForUser(userId)
  const where: Array<{ field: string; operator: '='; value: unknown }> = [
    { field: 'user_id', operator: '=', value: userId },
  ]
  if (req.query.dataset_id) {
    where.push({ field: 'dataset_id', operator: '=', value: String(req.query.dataset_id) })
  }
  if (req.query.kind) {
    where.push({ field: 'kind', operator: '=', value: String(req.query.kind) })
  }
  const limit = req.query.limit ? Number(req.query.limit) : 50
  const rows = await findMany<InsightRow>('insights', {
    where,
    orderBy: [{ field: 'detected_at', direction: 'desc' }],
    limit,
  })
  if (rows.length === 0) return res.json([])

  const datasetIds = Array.from(new Set(rows.map((r) => r.dataset_id).filter(Boolean) as string[]))
  const datasets =
    datasetIds.length > 0
      ? await findMany<{ id?: string; name?: string }>('datasets', {
          where: [{ field: 'id', operator: 'in', value: datasetIds }],
        })
      : []
  const nameById = new Map<string, string>()
  for (const d of datasets) nameById.set(String(d.id ?? ''), String(d.name ?? ''))
  res.json(rows.map((r) => decorate(r, nameById.get(String(r.dataset_id ?? '')) ?? 'unknown')))
})

router.post('/', validateBody(createSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof createSchema>
  const dataset = await findById<Record<string, unknown>>('datasets', body.dataset_id)
  if (!dataset || dataset.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('datasets.notFound', {}, { defaultValue: 'Dataset not found' }) })
  }
  const result = await create<InsightRow>('insights', {
    user_id: userId,
    dataset_id: body.dataset_id,
    kind: body.kind,
    headline: body.headline,
    body_md: body.body_md ?? '',
    confidence: body.confidence ?? 0,
    detected_at: new Date(),
  })
  const persisted = (result as { data?: InsightRow }).data ?? (result as InsightRow)
  res.status(201).json(decorate(persisted, String(dataset.name ?? 'unknown')))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = getParamId(req, 'id')
  const row = await findById<InsightRow>('insights', id)
  if (!row || row.user_id !== userId) {
    return res.status(404).json({ error: t('errors.notFound') })
  }
  const dataset = row.dataset_id
    ? await findById<{ name?: string }>('datasets', row.dataset_id)
    : null
  res.json(decorate(row, String(dataset?.name ?? 'unknown')))
})

export default router
