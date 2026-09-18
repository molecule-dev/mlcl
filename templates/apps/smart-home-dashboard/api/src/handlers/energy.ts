import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { MutationResult, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

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

const createReadingSchema = z.object({
  device_id: z.string().optional().nullable(),
  watts: z.number(),
  kilowatt_hours: z.number().optional().nullable(),
  voltage: z.number().optional().nullable(),
  current: z.number().optional().nullable(),
})

router.post('/readings', validateBody(createReadingSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { device_id, watts, kilowatt_hours, voltage, current } = req.body
    if (device_id) {
      const device = await findById<Record<string, unknown>>('iot_devices', device_id)
      if (!device || device.user_id !== userId) {
        res
          .status(404)
          .json({ error: t('devices.notFound', {}, { defaultValue: 'Device not found' }) })
        return
      }
    }
    const result = await create('energy_readings', {
      user_id: userId,
      device_id: device_id ?? null,
      watts: Number(watts),
      kilowatt_hours: kilowatt_hours != null ? Number(kilowatt_hours) : null,
      voltage: voltage != null ? Number(voltage) : null,
      current: current != null ? Number(current) : null,
      recorded_at: new Date(),
    })
    res.status(201).json(unwrap(result))
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/readings', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { device_id, page = 1, limit = 100 } = req.query
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (device_id) where.push({ field: 'device_id', operator: '=', value: String(device_id) })

    const readings = await findMany('energy_readings', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
    })
    res.json(readings)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/summary/daily', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { days = 30 } = req.query
    const summaries = await findMany('energy_daily_summary', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: Number(days),
      orderBy: [{ field: 'date', direction: 'desc' }],
    })
    res.json(summaries)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/summary/monthly', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { months = 12 } = req.query
    const summaries = await findMany('energy_monthly_summary', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: Number(months),
      orderBy: [{ field: 'month', direction: 'desc' }],
    })
    res.json(summaries)
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/current', async (_req: Request, res: Response) => {
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
    const current: Array<Record<string, unknown>> = []
    for (const device of list) {
      const readings = await findMany<Record<string, unknown>>('energy_readings', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'device_id', operator: '=', value: device.id },
        ],
        limit: 1,
        orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      })
      const latest = Array.isArray(readings) ? readings : []
      if (latest.length > 0) {
        current.push({
          device_id: device.id,
          device_name: device.name,
          device_type: device.type,
          room: device.room,
          ...latest[0],
        })
      }
    }
    const totalWatts = current.reduce((sum, r) => sum + Number(r.watts || 0), 0)
    res.json({ total_watts: totalWatts, devices: current })
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const daily = await findMany<Record<string, unknown>>('energy_daily_summary', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
      orderBy: [{ field: 'date', direction: 'desc' }],
    })
    const monthly = await findMany<Record<string, unknown>>('energy_monthly_summary', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
      orderBy: [{ field: 'month', direction: 'desc' }],
    })
    const dList = Array.isArray(daily) ? daily : []
    const mList = Array.isArray(monthly) ? monthly : []
    res.json({
      today_kwh: dList.length > 0 ? Number(dList[0].total_kwh || 0) : 0,
      today_cost: dList.length > 0 ? Number(dList[0].estimated_cost || 0) : 0,
      month_kwh: mList.length > 0 ? Number(mList[0].total_kwh || 0) : 0,
      month_cost: mList.length > 0 ? Number(mList[0].estimated_cost || 0) : 0,
    })
  } catch (err) {
    console.error('[smart-home-dashboard]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
