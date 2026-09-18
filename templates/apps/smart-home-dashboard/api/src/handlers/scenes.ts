import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { MutationResult } from '@molecule/api-database'
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

const deviceStateSchema = z.object({
  device_id: z.string().min(1),
  is_on: z.boolean(),
  properties: z.record(z.string(), z.unknown()).optional(),
})

const createSceneSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  icon: z.string().optional().default('home'),
  device_states: z.array(deviceStateSchema),
})

const updateSceneSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  device_states: z.array(deviceStateSchema).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const scenes = await findMany('scenes', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(scenes)
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
    const scene = await findById<Record<string, unknown>>('scenes', id)
    if (!scene || scene.user_id !== userId) {
      res.status(404).json({ error: t('scenes.notFound', {}, { defaultValue: 'Scene not found' }) })
      return
    }
    res.json(scene)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier scene cap (tiers.ts maxScenes) — defined but never enforced.
const enforceSceneLimit = enforceLimit<SmartHomeDashboardLimits>({
  limitType: 'maxScenes',
  getLimit: (limits) => limits.maxScenes,
  getCurrent: async (userId) =>
    count('scenes', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceSceneLimit,
  validateBody(createSceneSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { name, description, icon, device_states } = req.body
      const result = await create('scenes', {
        user_id: userId,
        name,
        description: description ?? '',
        icon: icon ?? 'home',
        device_states: JSON.stringify(device_states ?? []),
        activation_count: 0,
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

router.put('/:id', validateBody(updateSceneSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const scene = await findById<Record<string, unknown>>('scenes', id)
    if (!scene || scene.user_id !== userId) {
      res.status(404).json({ error: t('scenes.notFound', {}, { defaultValue: 'Scene not found' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (updates.device_states !== undefined) {
      updates.device_states = JSON.stringify(updates.device_states)
    }
    const result = await updateById('scenes', id, updates)
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/activate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const scene = await findById<Record<string, unknown>>('scenes', id)
    if (!scene || scene.user_id !== userId) {
      res.status(404).json({ error: t('scenes.notFound', {}, { defaultValue: 'Scene not found' }) })
      return
    }
    const deviceStates = scene.device_states as Array<{
      device_id: string
      is_on: boolean
      properties?: Record<string, unknown>
    }>
    for (const state of deviceStates) {
      const device = await findById<Record<string, unknown>>('iot_devices', state.device_id)
      if (!device || device.user_id !== userId) continue
      const updates: Record<string, unknown> = {
        is_on: state.is_on,
        updated_at: new Date(),
      }
      if (state.properties) {
        const currentProperties = (device.properties as Record<string, unknown>) || {}
        updates.properties = JSON.stringify({ ...currentProperties, ...state.properties })
      }
      await updateById('iot_devices', state.device_id, updates)
      await create('device_events', {
        device_id: state.device_id,
        user_id: userId,
        event_type: state.is_on ? 'turned_on' : 'turned_off',
        triggered_by: 'scene',
        scene_id: id,
        timestamp: new Date(),
      })
    }
    await updateById('scenes', id, {
      last_activated: new Date(),
      activation_count: Number(scene.activation_count || 0) + 1,
      updated_at: new Date(),
    })
    res.json({ ok: true, message: t('scenes.activated', {}, { defaultValue: 'Scene activated' }) })
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
    const scene = await findById<Record<string, unknown>>('scenes', id)
    if (!scene || scene.user_id !== userId) {
      res.status(404).json({ error: t('scenes.notFound', {}, { defaultValue: 'Scene not found' }) })
      return
    }
    await deleteById('scenes', id)
    res.status(204).end()
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
