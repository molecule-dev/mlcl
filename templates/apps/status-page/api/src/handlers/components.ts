import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'

import { generateHeartbeatKey } from '../lib/heartbeats.js'
import type { StatusPageLimits } from '../tiers.js'
import { writeAuditLog } from './_audit.js'

const router = Router()

const VALID_STATUSES = [
  'operational',
  'degraded_performance',
  'partial_outage',
  'major_outage',
  'under_maintenance',
] as const

// A heartbeat monitor is configured by INTERVAL only. The key itself is minted
// server-side by `generateHeartbeatKey()` and never accepted from the client —
// it is the credential in a public URL, and a caller-chosen one would be a
// guessable slug. Max 24h: beyond that the monitor stops being a deadman.
const heartbeatIntervalSchema = z.number().int().positive().max(86_400)

const createBodySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().default(''),
  group: z.string().optional().default(''),
  monitor_url: z.string().optional().default(''),
  sort_order: z.number().int().nonnegative().optional().default(0),
  heartbeat_interval_seconds: heartbeatIntervalSchema.optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(VALID_STATUSES),
})

const updateBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  group: z.string().optional(),
  monitor_url: z.string().optional(),
  sort_order: z.number().int().nonnegative().optional(),
  status: z.enum(VALID_STATUSES).optional(),
  // `null` disables the heartbeat (clears key, interval and last-beat together —
  // leaving a stale key behind would keep a dead URL live). A number enables it,
  // minting a key on the first enable.
  heartbeat_interval_seconds: heartbeatIntervalSchema.nullable().optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const components = await findMany('status_components', {
    where,
    orderBy: [{ field: 'sort_order', direction: 'asc' }],
  })
  res.json(components)
})

router.get('/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const component = await findById<Record<string, unknown>>('status_components', getParamId(req))
  if (!component || component.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('components.notFound', {}, { defaultValue: 'Component not found' }) })
  }
  const history = await findMany('component_status_history', {
    where: [{ field: 'component_id', operator: '=', value: component.id as string }],
    orderBy: [{ field: 'changed_at', direction: 'desc' }],
    limit: 90,
  })
  res.json({ ...component, history })
})

// Enforce the per-tier component cap (tiers.ts maxComponents) — defined + advertised in
// Pricing/CATALOG but enforceLimit was never called, so any tier could create unlimited.
const enforceComponentLimit = enforceLimit<StatusPageLimits>({
  limitType: 'maxComponents',
  getLimit: (limits) => limits.maxComponents,
  getCurrent: async (userId) =>
    count('status_components', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceComponentLimit, async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const parsed = createBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const { name, description, group, monitor_url, sort_order, heartbeat_interval_seconds } =
    parsed.data
  const result = await create<Record<string, unknown>>('status_components', {
    user_id: userId,
    name,
    description,
    group,
    status: 'operational',
    monitor_url,
    sort_order,
    // The DB CHECK forbids a key without a positive interval, so mint the two together.
    heartbeat_key: heartbeat_interval_seconds ? generateHeartbeatKey() : null,
    heartbeat_interval_seconds: heartbeat_interval_seconds ?? null,
  })
  const created = (result.data ?? result) as { id: string }
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'component.create',
    scope: 'components',
    target: created.id,
    summary: name,
    payload: { status: 'operational' },
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
  const component = await findById<Record<string, unknown>>('status_components', id)
  if (!component || component.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('components.notFound', {}, { defaultValue: 'Component not found' }) })
  }
  const parsed = updateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const updates: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v
  }
  // Heartbeat enable/disable. The key is derived from the interval, never taken
  // from the request: `null` tears the whole monitor down (a surviving key would
  // leave a live URL for a monitor nobody is watching), and the first enable
  // mints one. Re-enabling an already-configured monitor keeps its key so the
  // sender's URL does not silently stop working.
  if ('heartbeat_interval_seconds' in parsed.data) {
    if (parsed.data.heartbeat_interval_seconds === null) {
      updates.heartbeat_key = null
      updates.heartbeat_interval_seconds = null
      updates.last_heartbeat_at = null
    } else if (!component.heartbeat_key) {
      updates.heartbeat_key = generateHeartbeatKey()
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.json(component)
  }
  const result = await updateById<Record<string, unknown>>('status_components', id, updates)
  if (typeof updates.status === 'string' && updates.status !== component.status) {
    await create('component_status_history', {
      component_id: component.id,
      status: updates.status,
      changed_at: new Date().toISOString(),
    })
  }
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'component.update',
    scope: 'components',
    target: id,
    summary: (updates.name as string | undefined) ?? (component.name as string | undefined),
    // The audit trail is readable by every team member and is exactly the kind of
    // place a credential gets copied to and forgotten. Record THAT the key
    // changed, never its value.
    payload: {
      ...updates,
      ...('heartbeat_key' in updates
        ? { heartbeat_key: updates.heartbeat_key === null ? null : '[generated]' }
        : {}),
    },
  })
  res.json(result.data ?? result)
})

router.put('/:id/status', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  }
  const id = getParamId(req)
  const component = await findById<Record<string, unknown>>('status_components', id)
  if (!component || component.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('components.notFound', {}, { defaultValue: 'Component not found' }) })
  }
  const parsed = updateStatusSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('components.invalidStatus', {}, { defaultValue: 'Invalid component status' }),
      errors: parsed.error.issues,
    })
  }
  const result = await updateById('status_components', id, { status: parsed.data.status })
  await create('component_status_history', {
    component_id: component.id,
    status: parsed.data.status,
    changed_at: new Date().toISOString(),
  })
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'component.statusChange',
    scope: 'components',
    target: id,
    summary: component.name as string | undefined,
    payload: { from: component.status, to: parsed.data.status },
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
  const component = await findById<Record<string, unknown>>('status_components', id)
  if (!component || component.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('components.notFound', {}, { defaultValue: 'Component not found' }) })
  }
  await deleteById('status_components', id)
  await writeAuditLog({
    userId,
    actorUserId: userId,
    action: 'component.delete',
    scope: 'components',
    target: id,
    summary: component.name as string | undefined,
  })
  res.status(204).end()
})

export default router
