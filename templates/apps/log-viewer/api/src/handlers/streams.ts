/**
 * log-viewer — streams (front-end alias for `log_sources`).
 *
 * The Streams page on the frontend reads from /api/streams. We map this
 * onto the existing `log_sources` table so a freshly-seeded user sees
 * their streams without any extra plumbing. POST creates a new stream
 * (subject to the `maxSources` entitlement), PATCH allows pause/resume.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { getEffectiveTier } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { LogViewerLimits } from '../tiers.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

interface StreamRow {
  id: string
  user_id: string
  name: string
  source: string | null
  format: string
  rate_per_sec: string | number
  retention_days: number
  status: string
  is_active: boolean
  ingest_token: string | null
  last_event_at: Date | string | null
  created_at: Date
  updated_at: Date
}

const createStreamSchema = z.object({
  name: z.string().min(1).max(255),
  source: z.string().max(255).optional(),
  format: z.string().min(1).max(64).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
})

const updateStreamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  source: z.string().max(255).optional(),
  format: z.string().min(1).max(64).optional(),
  retention_days: z.number().int().min(1).max(3650).optional(),
  status: z.enum(['active', 'paused']).optional(),
})

function decorate(row: StreamRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    source: row.source ?? '',
    format: row.format,
    rate_per_sec:
      typeof row.rate_per_sec === 'string' ? Number(row.rate_per_sec) : row.rate_per_sec,
    retention_days: row.retention_days,
    status: row.status === 'paused' ? 'paused' : 'active',
    last_event_at:
      row.last_event_at instanceof Date
        ? row.last_event_at.toISOString()
        : ((row.last_event_at as string | null) ?? new Date().toISOString()),
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
  const rows = (await findMany<StreamRow>('log_sources', { where, orderBy })) as StreamRow[]
  res.json(rows.map(decorate))
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const row = await findById<StreamRow>('log_sources', id)
  if (!row || row.user_id !== userId) {
    res.status(404).json({ error: t('streams.notFound', {}, { defaultValue: 'Stream not found' }) })
    return
  }
  res.json(decorate(row))
})

router.post('/', validateBody(createStreamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const body = req.body as z.infer<typeof createStreamSchema>
  const existing = await count('log_sources', [{ field: 'user_id', operator: '=', value: userId }])
  const tier = await getEffectiveTier<LogViewerLimits>(res)
  if (existing >= tier.limits.maxSources) {
    res.status(403).json({
      error: t(
        'streams.limitReached',
        {},
        {
          defaultValue: 'You have reached your stream limit. Upgrade your plan to add more.',
        },
      ),
      limitType: 'maxSources',
      currentLimit: tier.limits.maxSources,
      category: tier.category,
    })
    return
  }
  const result = await create<StreamRow>('log_sources', {
    user_id: userId,
    name: body.name,
    format: body.format ?? 'json',
    source: body.source ?? '',
    type: 'generic',
    environment: 'production',
    rate_per_sec: 0,
    retention_days: body.retention_days ?? 30,
    status: 'active',
    is_active: true,
    ingest_token: null,
    last_event_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data ? decorate(result.data as StreamRow) : null)
})

router.patch('/:id', validateBody(updateStreamSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const idParam = req.params.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam
  const row = await findById<StreamRow>('log_sources', id)
  if (!row || row.user_id !== userId) {
    res.status(404).json({ error: t('streams.notFound', {}, { defaultValue: 'Stream not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateStreamSchema>
  const update: Record<string, unknown> = { updated_at: new Date() }
  if (body.name !== undefined) update.name = body.name
  if (body.source !== undefined) update.source = body.source
  if (body.format !== undefined) update.format = body.format
  if (body.retention_days !== undefined) update.retention_days = body.retention_days
  if (body.status !== undefined) {
    update.status = body.status
    update.is_active = body.status === 'active'
  }
  const updated = await updateById<StreamRow>('log_sources', id, update)
  res.json(updated.data ? decorate(updated.data as StreamRow) : null)
})

export default router
