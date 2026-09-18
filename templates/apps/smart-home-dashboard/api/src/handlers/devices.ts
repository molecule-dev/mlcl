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

const createDeviceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['light', 'thermostat', 'lock', 'camera', 'sensor', 'outlet']).default('sensor'),
  room: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  firmware_version: z.string().optional().nullable(),
})

const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['light', 'thermostat', 'lock', 'camera', 'sensor', 'outlet']).optional(),
  room: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  firmware_version: z.string().optional().nullable(),
  status: z.enum(['online', 'offline']).optional(),
})

const propertiesSchema = z.record(z.string(), z.unknown())

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const devices = await findMany('iot_devices', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(devices)
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
    const device = await findById<Record<string, unknown>>('iot_devices', id)
    if (!device || device.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('devices.notFound', {}, { defaultValue: 'Device not found' }) })
      return
    }
    res.json(device)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier device cap (tiers.ts maxDevices) — it was defined + shown in
// Pricing/Settings but never enforced, so a free user could create unlimited devices.
const enforceDeviceLimit = enforceLimit<SmartHomeDashboardLimits>({
  limitType: 'maxDevices',
  getLimit: (limits) => limits.maxDevices,
  getCurrent: async (userId) =>
    count('iot_devices', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post(
  '/',
  enforceDeviceLimit,
  validateBody(createDeviceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { name, type, room, manufacturer, model, firmware_version } = req.body
      const result = await create('iot_devices', {
        user_id: userId,
        name,
        type: type ?? 'sensor',
        room: room ?? null,
        manufacturer: manufacturer ?? null,
        model: model ?? null,
        firmware_version: firmware_version ?? null,
        status: 'offline',
        is_on: false,
        properties: JSON.stringify({}),
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

router.put('/:id', validateBody(updateDeviceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('iot_devices', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('devices.notFound', {}, { defaultValue: 'Device not found' }) })
      return
    }
    const result = await updateById('iot_devices', id, {
      ...req.body,
      updated_at: new Date(),
    })
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const device = await findById<Record<string, unknown>>('iot_devices', id)
    if (!device || device.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('devices.notFound', {}, { defaultValue: 'Device not found' }) })
      return
    }
    const nextOn = !device.is_on
    const result = await updateById('iot_devices', id, {
      is_on: nextOn,
      updated_at: new Date(),
    })
    await create('device_events', {
      device_id: id,
      user_id: userId,
      event_type: nextOn ? 'turned_on' : 'turned_off',
      triggered_by: 'user',
      timestamp: new Date(),
    })
    res.json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/:id/properties',
  validateBody(propertiesSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const id = getParamId(req)
      const device = await findById<Record<string, unknown>>('iot_devices', id)
      if (!device || device.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('devices.notFound', {}, { defaultValue: 'Device not found' }) })
        return
      }
      const currentProperties = (device.properties as Record<string, unknown>) || {}
      const result = await updateById('iot_devices', id, {
        properties: JSON.stringify({ ...currentProperties, ...req.body }),
        updated_at: new Date(),
      })
      await create('device_events', {
        device_id: id,
        user_id: userId,
        event_type: 'property_changed',
        triggered_by: 'user',
        timestamp: new Date(),
      })
      res.json(unwrap(result))
    } catch (err) {
      console.error('[smart-home-dashboard]', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('iot_devices', id)
    if (!existing || existing.user_id !== userId) {
      res
        .status(404)
        .json({ error: t('devices.notFound', {}, { defaultValue: 'Device not found' }) })
      return
    }
    await deleteById('iot_devices', id)
    res.status(204).end()
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/stats/overview', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const devices = await findMany<Record<string, unknown>>('iot_devices', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
    })
    const list = Array.isArray(devices) ? devices : []
    const total = list.length
    const online = list.filter((d) => d.status === 'online').length
    const offline = list.filter((d) => d.status === 'offline').length
    const on = list.filter((d) => d.is_on).length
    const byType: Record<string, number> = {}
    for (const d of list) {
      const type = String(d.type)
      byType[type] = (byType[type] || 0) + 1
    }
    res.json({ total, online, offline, on, byType })
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
