/**
 * Check-in handlers — owner-scoped weekly KR updates.
 *
 * On POST, the new value is also written through to the parent
 * key_result so progress recomputes immediately.
 *
 * Uses the abstract DataStore from @molecule/api-database (no raw SQL).
 * Every read/write scopes by owner_id = session.userId. Inputs are
 * validated with zod schemas declared inline.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser, validationError } from '@molecule/api-bonds-default-express'
import { create, findMany, findOne, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { recomputeObjectiveProgress } from './_progress.js'

const router = Router()

const checkInCreateSchema = z
  .object({
    objective_id: z.string().uuid().optional(),
    key_result_id: z.string().uuid().optional(),
    value: z.number().nullable().optional(),
    confidence: z.enum(['low', 'medium', 'high']).nullable().optional(),
    status: z.enum(['on_track', 'at_risk', 'off_track', 'completed']).nullable().optional(),
    note: z.string().max(10_000).nullable().optional(),
  })
  .refine((data) => data.objective_id || data.key_result_id, {
    message: 'Either objective_id or key_result_id is required',
  })

const listQuery = z.object({
  objective_id: z.string().uuid().optional(),
  key_result_id: z.string().uuid().optional(),
})

interface CheckInRow {
  id: string
  owner_id: string
  objective_id: string | null
  key_result_id: string | null
  value: number | string | null
  confidence: string | null
  status: string | null
  note: string | null
  occurred_at: string
  created_at: string
}

interface KeyResultRow {
  id: string
  owner_id: string
  objective_id: string
  metric_type: string
  start_value: number | string
  target_value: number | string
  current_value: number | string
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
    if (parsedQuery.data.key_result_id) {
      where.push({
        field: 'key_result_id',
        operator: '=',
        value: parsedQuery.data.key_result_id,
      })
    }
    const items = await findMany<CheckInRow>('check_ins', {
      where,
      orderBy: [{ field: 'occurred_at', direction: 'desc' }],
    })
    res.json(items)
  } catch (error) {
    logger.error('check-ins.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', async (req: Request, res: Response) => {
  const owner = requireUser(res)
  if (!owner) return
  const parsed = checkInCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    // Ownership check on the linked key_result / objective so a user can't
    // log a check-in against another user's row.
    if (parsed.data.key_result_id) {
      const kr = await findOne<KeyResultRow>('key_results', [
        { field: 'id', operator: '=', value: parsed.data.key_result_id },
        { field: 'owner_id', operator: '=', value: owner },
      ])
      if (!kr) {
        res.status(404).json({
          error: t('keyResult.notFound', {}, { defaultValue: 'Key result not found' }),
        })
        return
      }
      if (parsed.data.value !== null && parsed.data.value !== undefined) {
        const newCurrent = Number(parsed.data.value)
        const progress = computeProgress({
          metric_type: kr.metric_type,
          start_value: Number(kr.start_value),
          target_value: Number(kr.target_value),
          current_value: newCurrent,
        })
        const krUpdate: Record<string, unknown> = {
          current_value: newCurrent,
          progress,
          last_updated_at: new Date(),
          updated_at: new Date(),
        }
        // Propagate the check-in's health assessment to the key result (auto-completing at
        // 100%). This was dropped, so a user's at-risk/off-track pick silently reverted.
        if (progress >= 100) krUpdate.status = 'completed'
        else if (parsed.data.status) krUpdate.status = parsed.data.status
        await updateById('key_results', kr.id, krUpdate)
        // Roll the change up to the parent objective — nothing did before, so its progress
        // ring stayed frozen at the creation value while the KR rings moved.
        await recomputeObjectiveProgress(kr.objective_id)
      }
    } else if (parsed.data.objective_id) {
      const obj = await findOne('objectives', [
        { field: 'id', operator: '=', value: parsed.data.objective_id },
        { field: 'owner_id', operator: '=', value: owner },
      ])
      if (!obj) {
        res.status(404).json({
          error: t('objective.notFound', {}, { defaultValue: 'Objective not found' }),
        })
        return
      }
    }

    const result = await create<CheckInRow>('check_ins', {
      owner_id: owner,
      objective_id: parsed.data.objective_id ?? null,
      key_result_id: parsed.data.key_result_id ?? null,
      value: parsed.data.value ?? null,
      confidence: parsed.data.confidence ?? null,
      status: parsed.data.status ?? null,
      note: parsed.data.note ?? null,
      occurred_at: new Date(),
      created_at: new Date(),
    })
    if (!result.data) {
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
      return
    }
    const checkInRow = result.data

    // Side effect: each check-in produces an inbox notification so the
    // /notifications page reflects activity. Type maps to confidence
    // (or 'kr_completed' if the post-update KR progress reached 100).
    try {
      let progress = 0
      if (parsed.data.key_result_id) {
        const krAfter = await findOne<KeyResultRow & { progress?: number }>('key_results', [
          { field: 'id', operator: '=', value: parsed.data.key_result_id },
        ])
        if (krAfter && typeof krAfter.progress === 'number') progress = krAfter.progress
      }
      const status = parsed.data.status
      let notifType = 'check_in_due'
      if (progress >= 100 || status === 'completed') notifType = 'kr_completed'
      else if (status === 'at_risk') notifType = 'kr_at_risk'
      else if (status === 'off_track') notifType = 'kr_off_track'
      else notifType = 'kr_on_track'
      const titleByType: Record<string, string> = {
        kr_completed: 'Key result completed',
        kr_at_risk: 'Key result is at risk',
        kr_off_track: 'Key result is off track',
        kr_on_track: 'Check-in logged',
        check_in_due: 'Check-in logged',
      }
      await create('notifications', {
        user_id: owner,
        type: notifType,
        title: titleByType[notifType],
        body: parsed.data.note ?? null,
        data: {
          check_in_id: checkInRow.id,
          key_result_id: parsed.data.key_result_id ?? null,
          objective_id: parsed.data.objective_id ?? null,
        },
        read_at: null,
        created_at: new Date(),
      })
    } catch (_error) {
      // Notification creation must never fail the check-in itself.
    }

    res.status(201).json(checkInRow)
  } catch (error) {
    logger.error('check-ins.create', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
