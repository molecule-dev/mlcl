/**
 * Key Result handlers — owner-scoped CRUD with progress recompute.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 * Every read/write scopes by owner_id = session.userId. Inputs are
 * validated with zod schemas declared inline.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser, validationError } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findMany,
  findOne,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { OkrGoalTrackingLimits } from '../tiers.js'
import { recomputeObjectiveProgress } from './_progress.js'

const router = Router()

const metricEnum = z.enum(['number', 'percent', 'boolean', 'milestone'])
const statusEnum = z.enum(['on_track', 'at_risk', 'off_track', 'completed', 'archived'])

const krCreateSchema = z.object({
  objective_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  metric_type: metricEnum.optional(),
  start_value: z.number().optional(),
  target_value: z.number().optional(),
  current_value: z.number().optional(),
  unit: z.string().max(32).nullable().optional(),
  status: statusEnum.optional(),
  position: z.number().optional(),
})

const krUpdateSchema = krCreateSchema.partial().omit({ objective_id: true })

const idParam = z.object({ id: z.string().uuid() })

const listQuery = z.object({
  objective_id: z.string().uuid().optional(),
})

interface KeyResultRow {
  id: string
  owner_id: string
  objective_id: string
  title: string
  metric_type: string
  start_value: number | string
  target_value: number | string
  current_value: number | string
  unit: string | null
  status: string
  progress: number
  position: number
  last_updated_at: string | null
  created_at: string
  updated_at: string
}

const computeProgress = (kr: {
  metric_type: string
  start_value: number
  target_value: number
  current_value: number
}): number => {
  if (kr.metric_type === 'boolean') return kr.current_value ? 100 : 0
  const span = Number(kr.target_value) - Number(kr.start_value)
  if (!Number.isFinite(span) || span === 0) return 0
  const done = Number(kr.current_value) - Number(kr.start_value)
  const pct = (done / span) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

router.get('/', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsedQuery = listQuery.safeParse(req.query)
  if (!parsedQuery.success) {
    validationError(res, parsedQuery.error.issues)
    return
  }
  try {
    const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: owner }]
    if (parsedQuery.data.objective_id) {
      where.push({
        field: 'objective_id',
        operator: '=',
        value: parsedQuery.data.objective_id,
      })
    }
    const items = await findMany<KeyResultRow>('key_results', {
      where,
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('key-results.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier key-result cap (tiers.ts maxKeyResults) — defined + advertised in CATALOG but
// enforceLimit was never called, so any tier could create unlimited key results. (maxCheckIns is NOT
// enforced: check-ins are periodic progress updates that accumulate over time, so a total-count cap
// would break tracking after a few updates — objectives + key results are the bounded entities.)
const enforceKeyResultLimit = enforceLimit<OkrGoalTrackingLimits>({
  limitType: 'maxKeyResults',
  getLimit: (limits) => limits.maxKeyResults,
  getCurrent: async (userId) =>
    count('key_results', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceKeyResultLimit, async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsed = krCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    // Reject creating a KR for an objective the caller doesn't own (no IDOR).
    const parent = await findOne('objectives', [
      { field: 'id', operator: '=', value: parsed.data.objective_id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!parent) {
      res.status(404).json({
        error: t('objective.notFound', {}, { defaultValue: 'Objective not found' }),
      })
      return
    }
    const start_value = parsed.data.start_value ?? 0
    const target_value = parsed.data.target_value ?? 100
    const current_value = parsed.data.current_value ?? start_value
    const metric_type = parsed.data.metric_type ?? 'percent'
    const result = await create<KeyResultRow>('key_results', {
      owner_id: owner,
      objective_id: parsed.data.objective_id,
      title: parsed.data.title,
      metric_type,
      start_value,
      target_value,
      current_value,
      unit: parsed.data.unit ?? null,
      status: parsed.data.status ?? 'on_track',
      progress: computeProgress({ metric_type, start_value, target_value, current_value }),
      position: parsed.data.position ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await recomputeObjectiveProgress(parsed.data.objective_id)
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('key-results.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  const body = krUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, !id.success ? id.error.issues : body.success ? [] : body.error.issues)
    return
  }
  try {
    const existing = await findOne<KeyResultRow>('key_results', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('keyResult.notFound', {}, { defaultValue: 'Key result not found' }),
      })
      return
    }
    const merged = { ...existing, ...body.data } as unknown as {
      metric_type: string
      start_value: number
      target_value: number
      current_value: number
    }
    const updates: Record<string, unknown> = {
      ...body.data,
      progress: computeProgress({
        metric_type: merged.metric_type,
        start_value: Number(merged.start_value),
        target_value: Number(merged.target_value),
        current_value: Number(merged.current_value),
      }),
      last_updated_at: new Date(),
      updated_at: new Date(),
    }
    const result = await updateById<KeyResultRow>('key_results', id.data.id, updates)
    await recomputeObjectiveProgress(existing.objective_id)
    res.json(result.data)
  } catch (error) {
    logger.error('key-results.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<KeyResultRow>('key_results', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('keyResult.notFound', {}, { defaultValue: 'Key result not found' }),
      })
      return
    }
    await deleteById('key_results', id.data.id)
    await recomputeObjectiveProgress(existing.objective_id)
    res.status(204).end()
  } catch (error) {
    logger.error('key-results.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
