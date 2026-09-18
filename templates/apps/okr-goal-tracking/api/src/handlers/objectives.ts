/**
 * Objective handlers — owner-scoped CRUD with archive/unarchive,
 * progress recompute, and audit-event capture on edit.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 * Every read/write scopes by owner_id = session.userId. Inputs are
 * validated with zod schemas declared inline; the bond is loaded
 * transitively via @molecule/api-utilities-validation.
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

const router = Router()

const scopeEnum = z.enum(['individual', 'team', 'company'])
const statusEnum = z.enum(['on_track', 'at_risk', 'off_track', 'completed', 'archived'])

const objectiveCreateSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10_000).nullable().optional(),
  scope: scopeEnum.optional(),
  team_id: z.string().uuid().nullable().optional(),
  period_id: z.string().uuid().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  status: statusEnum.optional(),
  progress: z.number().int().min(0).max(100).optional(),
})

const objectiveUpdateSchema = objectiveCreateSchema.partial()

const idParam = z.object({ id: z.string().uuid() })

const listQuery = z.object({
  scope: scopeEnum.optional(),
  team_id: z.string().uuid().optional(),
  period_id: z.string().uuid().optional(),
  parent_id: z.string().uuid().optional(),
  status: statusEnum.optional(),
  archived: z.enum(['true', 'false', 'any']).optional(),
})

interface ObjectiveRow {
  id: string
  owner_id: string
  team_id: string | null
  period_id: string | null
  parent_id: string | null
  scope: string
  title: string
  description: string | null
  status: string
  progress: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

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
    const { scope, team_id, period_id, parent_id, status, archived } = parsedQuery.data
    if (scope) where.push({ field: 'scope', operator: '=', value: scope })
    if (team_id) where.push({ field: 'team_id', operator: '=', value: team_id })
    if (period_id) where.push({ field: 'period_id', operator: '=', value: period_id })
    if (parent_id) where.push({ field: 'parent_id', operator: '=', value: parent_id })
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (archived === 'true') {
      where.push({ field: 'archived_at', operator: 'is_not_null' })
    } else if (archived !== 'any') {
      where.push({ field: 'archived_at', operator: 'is_null' })
    }
    const items = await findMany<ObjectiveRow>('objectives', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('objectives.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const item = await findOne<ObjectiveRow>('objectives', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!item) {
      res.status(404).json({
        error: t('objective.notFound', {}, { defaultValue: 'Objective not found' }),
      })
      return
    }
    const keyResults = await findMany<KeyResultRow>('key_results', {
      where: [{ field: 'objective_id', operator: '=', value: id.data.id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...item, key_results: keyResults })
  } catch (error) {
    logger.error('objectives.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier objective cap (tiers.ts maxObjectives) — defined + advertised in CATALOG but
// enforceLimit was never called, so any tier could create unlimited objectives.
const enforceObjectiveLimit = enforceLimit<OkrGoalTrackingLimits>({
  limitType: 'maxObjectives',
  getLimit: (limits) => limits.maxObjectives,
  getCurrent: async (userId) =>
    count('objectives', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceObjectiveLimit, async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsed = objectiveCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const result = await create<ObjectiveRow>('objectives', {
      owner_id: owner,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      scope: parsed.data.scope ?? 'individual',
      team_id: parsed.data.team_id ?? null,
      period_id: parsed.data.period_id ?? null,
      parent_id: parsed.data.parent_id ?? null,
      status: parsed.data.status ?? 'on_track',
      progress: parsed.data.progress ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('objectives.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  const body = objectiveUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    validationError(res, !id.success ? id.error.issues : body.success ? [] : body.error.issues)
    return
  }
  try {
    const existing = await findOne<ObjectiveRow>('objectives', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('objective.notFound', {}, { defaultValue: 'Objective not found' }),
      })
      return
    }
    const updates: Record<string, unknown> = { ...body.data, updated_at: new Date() }
    const result = await updateById<ObjectiveRow>('objectives', id.data.id, updates)

    // Capture an audit event so EditObjective's "recent edits" sidebar has data.
    await create('audit_events', {
      owner_id: owner,
      actor_user_id: owner,
      table_name: 'objectives',
      record_id: id.data.id,
      action: 'update',
      before: existing,
      after: result.data,
      occurred_at: new Date(),
    })

    res.json(result.data)
  } catch (error) {
    logger.error('objectives.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/archive', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    validationError(res, id.error.issues)
    return
  }
  try {
    const existing = await findOne<ObjectiveRow>('objectives', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('objective.notFound', {}, { defaultValue: 'Objective not found' }),
      })
      return
    }
    await updateById('objectives', id.data.id, {
      status: 'archived',
      archived_at: new Date(),
      updated_at: new Date(),
    })
    res.json({ archived: true })
  } catch (error) {
    logger.error('objectives.archive', error)
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
    const existing = await findOne<ObjectiveRow>('objectives', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: owner },
    ])
    if (!existing) {
      res.status(404).json({
        error: t('objective.notFound', {}, { defaultValue: 'Objective not found' }),
      })
      return
    }
    await deleteById('objectives', id.data.id)
    res.status(204).end()
  } catch (error) {
    logger.error('objectives.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
