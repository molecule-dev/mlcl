import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { MutationResult, WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import type { SmartHomeDashboardLimits } from '../tiers.js'

function unwrap<T>(result: MutationResult<T> | T): T {
  if (
    result &&
    typeof result === 'object' &&
    'data' in (result as object) &&
    'affected' in (result as object)
  ) {
    return (result as MutationResult<T>).data ?? (result as unknown as T)
  }
  return result as T
}

const router = Router()

const triggerSchema = z.object({
  type: z.enum(['time', 'device', 'event']),
  value: z.unknown(),
})

const actionSchema = z.object({
  type: z.string().min(1),
  target: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
})

const createAutomationSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  trigger: triggerSchema,
  conditions: z.array(z.record(z.string(), z.unknown())).optional().default([]),
  actions: z.array(actionSchema).min(1),
  enabled: z.boolean().optional().default(true),
})

const updateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: triggerSchema.optional(),
  conditions: z.array(z.record(z.string(), z.unknown())).optional(),
  actions: z.array(actionSchema).optional(),
  enabled: z.boolean().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (req.query.enabled !== undefined) {
      where.push({ field: 'enabled', operator: '=', value: req.query.enabled === 'true' })
    }
    const automations = await findMany('automations', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(automations)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    res.json(automation)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier automation cap (tiers.ts maxAutomations) — defined but never enforced.
const enforceAutomationLimit = enforceLimit<SmartHomeDashboardLimits>({
  limitType: 'maxAutomations',
  getLimit: (limits) => limits.maxAutomations,
  getCurrent: async (userId) =>
    count('automations', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceAutomationLimit,
  validateBody(createAutomationSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { name, description, trigger, conditions, actions, enabled } = req.body
      const result = await create('automations', {
        user_id: userId,
        name,
        description: description ?? '',
        trigger: JSON.stringify(trigger ?? {}),
        conditions: JSON.stringify(conditions ?? []),
        actions: JSON.stringify(actions ?? []),
        enabled: enabled !== false,
        execution_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(unwrap(result))
    } catch (err) {
      console.error('[smart-home-dashboard]', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateAutomationSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    for (const key of ['trigger', 'conditions', 'actions']) {
      if (updates[key] !== undefined) updates[key] = JSON.stringify(updates[key])
    }
    const result = await updateById('automations', id, updates)
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/enable', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    const result = await updateById('automations', id, { enabled: true, updated_at: new Date() })
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/disable', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    const result = await updateById('automations', id, { enabled: false, updated_at: new Date() })
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/log', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    const logs = await findMany('automation_logs', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'automation_id', operator: '=', value: id },
      ],
      orderBy: [{ field: 'executed_at', direction: 'desc' }],
    })
    res.json(logs)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * Executes an automation's stored `actions` against the caller's devices/scenes.
 * The trigger route used to log a hardcoded success without ever running the
 * actions, so "Test now" (and any real trigger) changed nothing. Actions use the
 * seeded vocabulary — device.on / device.off / device.update (merging
 * `properties`) and scene.activate (mirrors the scene-activation loop in
 * scenes.ts). Unknown types (e.g. notify) are a no-op, not a failure; `target`
 * aliases the id when a UI-authored action omits device_id/scene_id.
 */
type AutomationAction = {
  type?: string
  device_id?: string
  scene_id?: string
  target?: string
  properties?: Record<string, unknown>
}

function parseActions(raw: unknown): AutomationAction[] {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch (_error) {
      // Malformed stored JSON is treated as "no actions", the same as an absent value.
      value = []
    }
  }
  return Array.isArray(value) ? (value as AutomationAction[]) : []
}

async function applyDeviceChange(
  userId: string,
  automationId: string,
  deviceId: string,
  change: { is_on?: boolean; properties?: Record<string, unknown> },
): Promise<boolean> {
  const device = await findById<Record<string, unknown>>('iot_devices', deviceId)
  if (!device || device.user_id !== userId) return false
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (typeof change.is_on === 'boolean') updates.is_on = change.is_on
  if (change.properties) {
    const current = (device.properties as Record<string, unknown>) || {}
    updates.properties = JSON.stringify({ ...current, ...change.properties })
  }
  await updateById('iot_devices', deviceId, updates)
  await create('device_events', {
    device_id: deviceId,
    user_id: userId,
    event_type:
      typeof change.is_on === 'boolean' ? (change.is_on ? 'turned_on' : 'turned_off') : 'updated',
    triggered_by: 'automation',
    automation_id: automationId,
    timestamp: new Date(),
  })
  return true
}

async function activateSceneFor(
  userId: string,
  automationId: string,
  sceneId: string,
): Promise<boolean> {
  const scene = await findById<Record<string, unknown>>('scenes', sceneId)
  if (!scene || scene.user_id !== userId) return false
  const deviceStates =
    (scene.device_states as Array<{
      device_id: string
      is_on: boolean
      properties?: Record<string, unknown>
    }>) || []
  for (const state of deviceStates) {
    await applyDeviceChange(userId, automationId, state.device_id, {
      is_on: state.is_on,
      properties: state.properties,
    })
  }
  return true
}

/** Runs every stored action; returns how many applied vs. failed (bad/unknown id). */
async function runAutomationActions(
  rawActions: unknown,
  userId: string,
  automationId: string,
): Promise<{ applied: number; failed: number }> {
  let applied = 0
  let failed = 0
  for (const action of parseActions(rawActions)) {
    const type = String(action.type ?? '')
      .toLowerCase()
      .replace(/_/g, '.')
    const deviceId = action.device_id ?? action.target
    const sceneId = action.scene_id ?? action.target
    try {
      let ok: boolean | null = null
      if (type === 'device.on') {
        ok = deviceId
          ? await applyDeviceChange(userId, automationId, deviceId, {
              is_on: true,
              properties: action.properties,
            })
          : false
      } else if (type === 'device.off') {
        ok = deviceId
          ? await applyDeviceChange(userId, automationId, deviceId, { is_on: false })
          : false
      } else if (type === 'device.update') {
        ok = deviceId
          ? await applyDeviceChange(userId, automationId, deviceId, {
              properties: action.properties,
            })
          : false
      } else if (type === 'scene.activate') {
        ok = sceneId ? await activateSceneFor(userId, automationId, sceneId) : false
      }
      // ok === null → unknown action type (e.g. notify): a no-op, not a failure.
      if (ok === true) applied++
      else if (ok === false) failed++
    } catch (_error) {
      // One action failing is expected and already counted; the run continues with the rest.
      failed++
    }
  }
  return { applied, failed }
}

router.post('/:id/trigger', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    const { applied, failed } = await runAutomationActions(automation.actions, userId, id)
    await create('automation_logs', {
      automation_id: id,
      user_id: userId,
      status: failed > 0 ? 'error' : 'success',
      trigger_type: 'manual',
      error_message:
        failed > 0
          ? t(
              'automations.actionsFailed',
              { failed, total: applied + failed },
              { defaultValue: '{{failed}} of {{total}} actions failed' },
            )
          : null,
      executed_at: new Date(),
    })
    await updateById('automations', id, {
      last_triggered: new Date(),
      execution_count: Number(automation.execution_count || 0) + 1,
      updated_at: new Date(),
    })
    res.json({
      ok: true,
      message: t('automations.triggered', {}, { defaultValue: 'Automation triggered' }),
    })
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const automation = await findById<Record<string, unknown>>('automations', id)
    if (!automation || automation.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('automations.notFound', {}, { defaultValue: 'Automation not found' }) })
      return
    }
    await deleteById('automations', id)
    res.status(204).end()
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
