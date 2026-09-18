import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import type { StatusPageLimits } from '../tiers.js'
import { writeAuditLog } from './_audit.js'

const router = Router()

const VALID_STATUSES = ['investigating', 'identified', 'monitoring', 'resolved'] as const
const VALID_IMPACTS = ['none', 'minor', 'major', 'critical'] as const

const createIncidentSchema = z.object({
  title: z.string().min(1).max(500),
  message: z.string().optional().default(''),
  impact: z.enum(VALID_IMPACTS).optional().default('minor'),
  status: z.enum(VALID_STATUSES).optional().default('investigating'),
  affected_components: z.array(z.string()).optional().default([]),
})

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  message: z.string().optional(),
  impact: z.enum(VALID_IMPACTS).optional(),
  affected_components: z.array(z.string()).optional(),
  status: z.enum(VALID_STATUSES).optional(),
})

const listQuerySchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(50),
})

const postUpdateSchema = z.object({
  status: z.enum(VALID_STATUSES),
  message: z.string().min(1).max(5000),
})

router.get('/', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = listQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  if (parsed.data.status) {
    where.push({ field: 'status', operator: '=', value: parsed.data.status })
  }
  const incidents = await findMany('incidents', {
    where,
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: parsed.data.limit,
  })
  res.json(incidents)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const incident = await findById<Record<string, unknown>>('incidents', getParamId(req))
  if (!incident || incident.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  const updates = await findMany('incident_updates', {
    where: [{ field: 'incident_id', operator: '=', value: incident.id as string }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
  })
  res.json({ ...incident, updates })
})

// Enforce the per-tier incident cap (tiers.ts maxIncidents) — defined + advertised but never enforced.
const enforceIncidentLimit = enforceLimit<StatusPageLimits>({
  limitType: 'maxIncidents',
  getLimit: (limits) => limits.maxIncidents,
  getCurrent: async (userId) =>
    count('incidents', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceIncidentLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = createIncidentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const result = await create<Record<string, unknown>>('incidents', {
    user_id: userId,
    title: parsed.data.title,
    status: parsed.data.status,
    impact: parsed.data.impact,
    affected_components: JSON.stringify(parsed.data.affected_components),
    message: parsed.data.message,
    resolved_at: parsed.data.status === 'resolved' ? new Date().toISOString() : null,
  })
  const created = (result.data ?? result) as { id: string }
  if (parsed.data.message) {
    await create('incident_updates', {
      incident_id: created.id,
      status: parsed.data.status,
      message: parsed.data.message,
      posted_by: userId,
    })
  }
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'incident.create',
    scope: 'incidents',
    target: created.id,
    summary: parsed.data.title,
    payload: { impact: parsed.data.impact, status: parsed.data.status },
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
  const incident = await findById<Record<string, unknown>>('incidents', id)
  if (!incident || incident.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  const parsed = updateIncidentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const updates: Record<string, unknown> = {}
  if (parsed.data.title !== undefined) updates.title = parsed.data.title
  if (parsed.data.message !== undefined) updates.message = parsed.data.message
  if (parsed.data.impact !== undefined) updates.impact = parsed.data.impact
  if (parsed.data.affected_components !== undefined) {
    updates.affected_components = JSON.stringify(parsed.data.affected_components)
  }
  if (parsed.data.status !== undefined) {
    updates.status = parsed.data.status
    if (parsed.data.status === 'resolved') {
      updates.resolved_at = new Date().toISOString()
    } else {
      updates.resolved_at = null
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.json(incident)
  }
  const result = await updateById('incidents', id, updates)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'incident.update',
    scope: 'incidents',
    target: id,
    summary: (updates.title as string | undefined) ?? (incident.title as string | undefined),
    payload: updates,
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
  const incident = await findById<Record<string, unknown>>('incidents', id)
  if (!incident || incident.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  await deleteById('incidents', id)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'incident.delete',
    scope: 'incidents',
    target: id,
    summary: incident.title as string | undefined,
  })
  res.status(204).end()
})

router.post('/:id/updates', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const incident = await findById<Record<string, unknown>>('incidents', id)
  if (!incident || incident.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('incidents.notFound', {}, { defaultValue: 'Incident not found' }) })
  }
  const parsed = postUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const update = await create('incident_updates', {
    incident_id: incident.id,
    status: parsed.data.status,
    message: parsed.data.message,
    posted_by: userId,
  })
  await updateById('incidents', id, {
    status: parsed.data.status,
    resolved_at: parsed.data.status === 'resolved' ? new Date().toISOString() : null,
  })
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'incident.statusChange',
    scope: 'incidents',
    target: id,
    summary: incident.title as string | undefined,
    payload: { from: incident.status, to: parsed.data.status },
  })
  res.status(201).json(update.data ?? update)
})

export default router
