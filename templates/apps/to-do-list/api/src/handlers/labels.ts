/**
 * Label handlers — owner-scoped CRUD with task-label join helpers.
 *
 * Uses @molecule/api-database DataStore. All lookups scope by owner_id,
 * inputs validated via zod. List response includes `task_count` per
 * label so the Labels page can show usage at a glance without N+1
 * queries from the frontend.
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { ToDoListLimits } from '../tiers.js'

const router = Router()

const labelCreateSchema = z.object({
  name: z.string().min(1).max(255),
  color: z.string().max(7).optional(),
})
const labelUpdateSchema = labelCreateSchema.partial()
const idParam = z.object({ id: z.string().uuid() })

const taskLabelSchema = z.object({
  task_id: z.string().uuid(),
  label_id: z.string().uuid(),
})

interface LabelRow {
  id: string
  owner_id: string
  name: string
  color: string
  created_at: string
  updated_at: string
}

router.get('/', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const items = await findMany<LabelRow>('labels', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    if (items.length === 0) {
      res.json([])
      return
    }
    // Backfill task_count by counting per-label join rows in one query.
    const joins = await findMany<{ label_id: string }>('task_labels', {
      where: [{ field: 'owner_id', operator: '=', value: ownerId }],
    })
    const counts = new Map<string, number>()
    for (const j of joins) counts.set(j.label_id, (counts.get(j.label_id) ?? 0) + 1)
    res.json(items.map((l) => ({ ...l, task_count: counts.get(l.id) ?? 0 })))
  } catch (err) {
    console.error('GET /labels failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier label cap (tiers.ts maxLabels) — defined + advertised but never enforced.
const enforceLabelLimit = enforceLimit<ToDoListLimits>({
  limitType: 'maxLabels',
  getLimit: (limits) => limits.maxLabels,
  getCurrent: async (userId) =>
    count('labels', [{ field: 'owner_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceLabelLimit, async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = labelCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    // Names are unique per owner (DB index labels_owner_name_unique).
    // Surface 409 instead of 500 so the UI can show a clean message.
    const existing = await findOne<LabelRow>('labels', [
      { field: 'owner_id', operator: '=', value: ownerId },
      { field: 'name', operator: '=', value: parsed.data.name },
    ])
    if (existing) {
      res.status(409).json({
        error: t(
          'label.duplicate',
          { name: parsed.data.name },
          { defaultValue: `Label "${parsed.data.name}" already exists.` },
        ),
      })
      return
    }
    const result = await create<LabelRow>('labels', {
      name: parsed.data.name,
      color: parsed.data.color ?? '#808080',
      owner_id: ownerId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json({ ...result.data, task_count: 0 })
  } catch (err) {
    console.error('POST /labels failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/assignments', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = taskLabelSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const owned = await findOne('labels', [
      { field: 'id', operator: '=', value: parsed.data.label_id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    const ownedTask = await findOne('tasks', [
      { field: 'id', operator: '=', value: parsed.data.task_id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned || !ownedTask) {
      res.status(404).json({ error: t('label.notFound', {}, { defaultValue: 'Label not found' }) })
      return
    }
    const existing = await findOne('task_labels', [
      { field: 'owner_id', operator: '=', value: ownerId },
      { field: 'task_id', operator: '=', value: parsed.data.task_id },
      { field: 'label_id', operator: '=', value: parsed.data.label_id },
    ])
    if (existing) {
      res.status(200).json({ ok: true })
      return
    }
    await create('task_labels', {
      task_id: parsed.data.task_id,
      label_id: parsed.data.label_id,
      owner_id: ownerId,
      created_at: new Date(),
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('POST /labels/assignments failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/assignments', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const source = req.method === 'DELETE' && req.query.task_id ? req.query : req.body
  const parsed = taskLabelSchema.safeParse(source)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    await deleteMany('task_labels', [
      { field: 'owner_id', operator: '=', value: ownerId },
      { field: 'task_id', operator: '=', value: parsed.data.task_id },
      { field: 'label_id', operator: '=', value: parsed.data.label_id },
    ])
    res.status(204).end()
  } catch (err) {
    console.error('DELETE /labels/assignments failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  const body = labelUpdateSchema.safeParse(req.body)
  if (!id.success || !body.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: !id.success ? id.error.issues : !body.success ? body.error.issues : [],
    })
    return
  }
  try {
    const owned = await findOne<LabelRow>('labels', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('label.notFound', {}, { defaultValue: 'Label not found' }) })
      return
    }
    const result = await updateById<LabelRow>('labels', id.data.id, {
      ...body.data,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    console.error(`PATCH /labels/:id failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const id = idParam.safeParse(req.params)
  if (!id.success) {
    res
      .status(400)
      .json({ error: t('validation.failed', {}, { defaultValue: 'Validation failed' }) })
    return
  }
  try {
    const owned = await findOne<LabelRow>('labels', [
      { field: 'id', operator: '=', value: id.data.id },
      { field: 'owner_id', operator: '=', value: ownerId },
    ])
    if (!owned) {
      res.status(404).json({ error: t('label.notFound', {}, { defaultValue: 'Label not found' }) })
      return
    }
    await deleteById('labels', id.data.id)
    res.status(204).end()
  } catch (err) {
    console.error(`DELETE /labels/:id failed:`, err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
