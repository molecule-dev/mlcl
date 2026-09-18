/**
 * log-viewer — saved searches CRUD.
 *
 * Mounted at both `/saved-searches` (canonical) and `/saved` (frontend
 * shortcut) — same routes either way.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
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

interface SavedRow {
  id: string
  user_id: string
  name: string
  query_string: string
  filters: unknown
  result_count: number
  last_run_at: Date | string | null
  shared: boolean
  owner: string | null
  created_at: Date
  updated_at: Date
}

const createSavedSchema = z.object({
  name: z.string().min(1).max(255),
  query_string: z.string().max(8000).optional(),
  query: z.string().max(8000).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  shared: z.boolean().optional(),
  owner: z.string().max(255).optional(),
})

const updateSavedSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  query_string: z.string().max(8000).optional(),
  query: z.string().max(8000).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  shared: z.boolean().optional(),
  owner: z.string().max(255).optional(),
})

function decorate(row: SavedRow): Record<string, unknown> {
  return {
    id: row.id,
    name: row.name,
    query: row.query_string,
    query_string: row.query_string,
    filters: typeof row.filters === 'string' ? safeParseObject(row.filters) : (row.filters ?? {}),
    shared: row.shared,
    owner: row.owner ?? '',
    result_count: row.result_count,
    last_run_at:
      row.last_run_at instanceof Date
        ? row.last_run_at.toISOString()
        : ((row.last_run_at as string | null) ?? new Date().toISOString()),
  }
}

function safeParseObject(s: string): Record<string, unknown> {
  try {
    const v = JSON.parse(s)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch (_error) {
    // Non-JSON string; fall back to empty object.
    return {}
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
  const orderBy: OrderBy[] = [{ field: 'updated_at', direction: 'desc' }]
  const rows = (await findMany<SavedRow>('saved_searches', { where, orderBy })) as SavedRow[]
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
  const id = getParamId(req)
  const row = await findById<SavedRow>('saved_searches', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('savedSearches.notFound', {}, { defaultValue: 'Saved search not found' }) })
    return
  }
  res.json(decorate(row))
})

router.post('/', validateBody(createSavedSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  await seedDemoForUser(userId)
  const body = req.body as z.infer<typeof createSavedSchema>
  const existing = await count('saved_searches', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const tier = await getEffectiveTier<LogViewerLimits>(res)
  if (existing >= tier.limits.maxSavedSearches) {
    res.status(403).json({
      error: t(
        'savedSearches.limitReached',
        {},
        {
          defaultValue: 'You have reached your saved-search limit. Upgrade your plan to save more.',
        },
      ),
      limitType: 'maxSavedSearches',
      currentLimit: tier.limits.maxSavedSearches,
      category: tier.category,
    })
    return
  }
  const result = await create<SavedRow>('saved_searches', {
    user_id: userId,
    name: body.name,
    query_string: body.query_string ?? body.query ?? '',
    filters: JSON.stringify(body.filters ?? {}),
    shared: body.shared ?? false,
    owner: body.owner ?? null,
    result_count: 0,
    last_run_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  })
  res.status(201).json(result.data ? decorate(result.data as SavedRow) : null)
})

router.put('/:id', validateBody(updateSavedSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const row = await findById<SavedRow>('saved_searches', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('savedSearches.notFound', {}, { defaultValue: 'Saved search not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateSavedSchema>
  const update: Record<string, unknown> = { updated_at: new Date() }
  if (body.name !== undefined) update.name = body.name
  if (body.query_string !== undefined) update.query_string = body.query_string
  if (body.query !== undefined) update.query_string = body.query
  if (body.filters !== undefined) update.filters = JSON.stringify(body.filters)
  if (body.shared !== undefined) update.shared = body.shared
  if (body.owner !== undefined) update.owner = body.owner
  const updated = await updateById<SavedRow>('saved_searches', id, update)
  res.json(updated.data ? decorate(updated.data as SavedRow) : null)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  const id = getParamId(req)
  const row = await findById<SavedRow>('saved_searches', id)
  if (!row || row.user_id !== userId) {
    res
      .status(404)
      .json({ error: t('savedSearches.notFound', {}, { defaultValue: 'Saved search not found' }) })
    return
  }
  await deleteById('saved_searches', id)
  res.status(204).end()
})

export default router
