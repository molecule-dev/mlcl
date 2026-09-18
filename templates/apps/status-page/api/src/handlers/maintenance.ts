import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { writeAuditLog } from './_audit.js'

const router = Router()

const VALID_STATUSES = ['scheduled', 'in_progress', 'verifying', 'completed', 'cancelled'] as const

const createSchema = z.object({
  title: z.string().min(1).max(500),
  message: z.string().optional().default(''),
  scheduled_for: z.string().min(1),
  scheduled_until: z.string().min(1),
  affected_components: z.array(z.string()).optional().default([]),
  status: z.enum(VALID_STATUSES).optional().default('scheduled'),
})

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  message: z.string().optional(),
  scheduled_for: z.string().optional(),
  scheduled_until: z.string().optional(),
  affected_components: z.array(z.string()).optional(),
  status: z.enum(VALID_STATUSES).optional(),
})

function durationMinutes(scheduledFor: string, scheduledUntil: string): number {
  const ms = new Date(scheduledUntil).getTime() - new Date(scheduledFor).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return 60
  return Math.max(1, Math.round(ms / 60000))
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const rows = await findMany('maintenance', {
    where,
    orderBy: [{ field: 'scheduled_for', direction: 'asc' }],
  })
  res.json(rows)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const row = await findById<Record<string, unknown>>('maintenance', getParamId(req))
  if (!row || row.user_id !== userId) {
    return res.status(404).json({
      error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance window not found' }),
    })
  }
  res.json(row)
})

router.post('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = createSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const result = await create<Record<string, unknown>>('maintenance', {
    user_id: userId,
    scheduled_by: userId,
    title: parsed.data.title,
    message: parsed.data.message,
    scheduled_for: parsed.data.scheduled_for,
    scheduled_until: parsed.data.scheduled_until,
    duration_minutes: durationMinutes(parsed.data.scheduled_for, parsed.data.scheduled_until),
    affected_components: JSON.stringify(parsed.data.affected_components),
    status: parsed.data.status,
  })
  const created = (result.data ?? result) as { id: string }
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'maintenance.create',
    scope: 'maintenance',
    target: created.id,
    summary: parsed.data.title,
    payload: { status: parsed.data.status },
  })
  res.status(201).json(result.data ?? result)
})

router.patch('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('maintenance', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance window not found' }),
    })
  }
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const updates: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.message !== undefined) updates.message = parsed.data.message
  if (parsed.data.scheduled_for !== undefined) updates.scheduled_for = parsed.data.scheduled_for
  if (parsed.data.scheduled_until !== undefined)
    updates.scheduled_until = parsed.data.scheduled_until
  if (parsed.data.affected_components !== undefined)
    updates.affected_components = JSON.stringify(parsed.data.affected_components)
  if (parsed.data.status !== undefined) updates.status = parsed.data.status
  if (parsed.data.scheduled_for !== undefined && parsed.data.scheduled_until !== undefined) {
    updates.duration_minutes = durationMinutes(
      parsed.data.scheduled_for,
      parsed.data.scheduled_until,
    )
  }
  const result = await updateById('maintenance', id, updates)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'maintenance.update',
    scope: 'maintenance',
    target: id,
    summary:
      typeof updates.title === 'string' ? updates.title : (existing.title as string | undefined),
    payload: { status: updates.status ?? existing.status },
  })
  res.json(result.data ?? result)
})

router.delete('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const existing = await findById<Record<string, unknown>>('maintenance', id)
  if (!existing || existing.user_id !== userId) {
    return res.status(404).json({
      error: t('maintenance.notFound', {}, { defaultValue: 'Maintenance window not found' }),
    })
  }
  await deleteById('maintenance', id)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'maintenance.delete',
    scope: 'maintenance',
    target: id,
    summary: existing.title as string | undefined,
  })
  res.status(204).end()
})

export default router
