/**
 * Telemetry handler — two distinct authn surfaces (mirrors the readings
 * pattern in `energy-monitoring`):
 *
 *   1. **Ingest (POST /, POST /batch)** — authenticated by the per-device
 *      bearer-token middleware (`requireDeviceToken`). The token resolves
 *      `deviceId` + `ownerId` from `device_tokens`; the body's `device_id`
 *      is ignored to prevent a compromised device from writing to other
 *      devices. Realtime broadcast to `telemetry:<device_id>`.
 *
 *   2. **Browse (GET /, GET /aggregations, GET /latest/:deviceId)** —
 *      session-authenticated user. All queries scope by the device's
 *      `owner_id` (joined through `iot_devices`).
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import { requireDeviceToken } from '../middleware/device-token-auth.js'
import type { IotDeviceManagerLimits } from '../tiers.js'

const router = Router()

const ingestSchema = z.object({
  metric: z.string().min(1),
  value: z.coerce.number(),
  unit: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  recorded_at: z.string().optional(),
  /** Tolerated for ergonomics but ignored — device_id is taken from the bearer token. */
  device_id: z.string().optional(),
})

const batchIngestSchema = z.object({
  points: z
    .array(
      z.object({
        metric: z.string().min(1),
        value: z.coerce.number(),
        unit: z.string().nullable().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        recorded_at: z.string().optional(),
      }),
    )
    .min(1)
    .max(1000),
})

const listQuerySchema = z.object({
  device_id: z.string().optional(),
  metric: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(100),
})

const aggQuerySchema = z.object({
  device_id: z.string().min(1),
  metric: z.string().min(1),
  start: z.string().optional(),
  end: z.string().optional(),
})

async function ownsDevice(userId: string, deviceId: string): Promise<boolean> {
  const device = await findById<Record<string, unknown>>('iot_devices', deviceId)
  return !!device && device.owner_id === userId
}

async function userDeviceIds(userId: string): Promise<string[]> {
  const rows = await findMany<{ id: string }>('iot_devices', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  return rows.map((r) => r.id)
}

/* ----------------------- ingest (device-token auth) ----------------------- */

router.post(
  '/',
  requireDeviceToken,
  enforceLimit<IotDeviceManagerLimits>({
    limitType: 'maxTelemetry',
    getLimit: (limits) => limits.maxTelemetry,
    getCurrent: async (userId) =>
      count('telemetry', [
        { field: 'device_id', operator: 'in', value: await userDeviceIds(userId) },
      ]).catch(() => 0),
  }) as unknown as RequestHandler,
  validateBody(ingestSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      const result = await create('telemetry', {
        device_id: auth.deviceId,
        metric: req.body.metric,
        value: Number(req.body.value),
        unit: req.body.unit ?? null,
        metadata: JSON.stringify(req.body.metadata ?? {}),
        recorded_at: req.body.recorded_at ? new Date(req.body.recorded_at) : new Date(),
      })
      const point = (result as { data: unknown }).data
      // A device that is actively reporting telemetry is, by definition,
      // online. Bump last_seen so dashboards reflect liveness; flip
      // status from offline → online (don't clobber explicit
      // warning/critical/decommissioned states a user might have set).
      try {
        const device = await findById<Record<string, unknown>>('iot_devices', auth.deviceId)
        if (device) {
          const updates: Record<string, unknown> = {
            last_seen: new Date(),
            updated_at: new Date(),
          }
          const currentStatus = String(device.status ?? 'offline')
          if (currentStatus === 'offline' || currentStatus === 'provisioning') {
            updates.status = 'online'
          }
          await updateById('iot_devices', auth.deviceId, updates)
        }
      } catch (_error) {
        /* device-status sync is best-effort; never block ingest */
      }
      try {
        await broadcast(`telemetry:${auth.deviceId}`, 'point', { point })
      } catch (_error) {
        /* realtime is best-effort */
      }
      res.status(201).json(point)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.post(
  '/batch',
  requireDeviceToken,
  validateBody(batchIngestSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      const items = req.body.points as Array<{
        metric: string
        value: number
        unit?: string | null
        metadata?: Record<string, unknown>
        recorded_at?: string
      }>
      const results: unknown[] = []
      for (const p of items) {
        const r = await create('telemetry', {
          device_id: auth.deviceId,
          metric: p.metric,
          value: Number(p.value),
          unit: p.unit ?? null,
          metadata: JSON.stringify(p.metadata ?? {}),
          recorded_at: p.recorded_at ? new Date(p.recorded_at) : new Date(),
        })
        results.push((r as { data: unknown }).data)
      }
      // Mirror the single-point ingest: an actively-reporting device is online.
      try {
        const device = await findById<Record<string, unknown>>('iot_devices', auth.deviceId)
        if (device) {
          const updates: Record<string, unknown> = {
            last_seen: new Date(),
            updated_at: new Date(),
          }
          const currentStatus = String(device.status ?? 'offline')
          if (currentStatus === 'offline' || currentStatus === 'provisioning') {
            updates.status = 'online'
          }
          await updateById('iot_devices', auth.deviceId, updates)
        }
      } catch (_error) {
        /* device-status sync is best-effort; never block batch ingest */
      }
      // Broadcast every point so batched telemetry reaches the live view too — the single-point
      // ingest already does this, and the handler doc promises `telemetry:<id>` for BOTH routes.
      try {
        for (const point of results) {
          await broadcast(`telemetry:${auth.deviceId}`, 'point', { point })
        }
      } catch (_error) {
        /* realtime is best-effort */
      }
      res.status(201).json(results)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

/* --------------------------- browse (session) --------------------------- */

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { device_id, metric, start, end, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const deviceIds = device_id
      ? (await ownsDevice(userId, device_id))
        ? [device_id]
        : []
      : await userDeviceIds(userId)
    if (deviceIds.length === 0) return res.json([])

    const where: Array<{ field: string; operator: '=' | 'in'; value: unknown }> = [
      { field: 'device_id', operator: 'in', value: deviceIds },
    ]
    if (metric) where.push({ field: 'metric', operator: '=', value: metric })

    const points = await findMany<Record<string, unknown>>('telemetry', {
      where,
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const filtered = points.filter((p) => {
      const ts = new Date(String(p.recorded_at))
      if (start && ts < new Date(String(start))) return false
      if (end && ts > new Date(String(end))) return false
      return true
    })
    res.json(filtered)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/aggregations', validateQuery(aggQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { device_id, metric, start, end } = req.query as unknown as z.infer<typeof aggQuerySchema>
    if (!(await ownsDevice(userId, device_id))) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }

    const points = await findMany<Record<string, unknown>>('telemetry', {
      where: [
        { field: 'device_id', operator: '=', value: device_id },
        { field: 'metric', operator: '=', value: metric },
      ],
      orderBy: [{ field: 'recorded_at', direction: 'asc' }],
      limit: 50_000,
    })
    const inRange = points.filter((p) => {
      const ts = new Date(String(p.recorded_at))
      if (start && ts < new Date(String(start))) return false
      if (end && ts > new Date(String(end))) return false
      return true
    })
    const values = inRange.map((p) => Number(p.value))
    const sum = values.reduce((a, b) => a + b, 0)
    res.json({
      device_id,
      metric,
      count: values.length,
      min: values.length > 0 ? Math.min(...values) : null,
      max: values.length > 0 ? Math.max(...values) : null,
      avg: values.length > 0 ? sum / values.length : null,
      sum,
    })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/latest/:deviceId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const deviceId = String(req.params.deviceId ?? '')
    if (!(await ownsDevice(userId, deviceId))) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }

    const points = await findMany<Record<string, unknown>>('telemetry', {
      where: [{ field: 'device_id', operator: '=', value: deviceId }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      limit: 100,
    })

    // Deduplicate by metric — keep the most recent for each.
    const latest = new Map<string, Record<string, unknown>>()
    for (const point of points) {
      const metric = String(point.metric)
      if (!latest.has(metric)) latest.set(metric, point)
    }
    res.json(Array.from(latest.values()))
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
