/**
 * Device logs handler. Two surfaces:
 *
 *   1. **Browse (GET /, GET /tail/:deviceId)** — session-authenticated.
 *      Scope by device ownership.
 *
 *   2. **Ingest (POST /)** — device-token authenticated. The token resolves
 *      `deviceId`; the body's `device_id` is ignored. Realtime broadcast on
 *      `logs:<device_id>` so the Console page can tail in near-real-time.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import { requireDeviceToken } from '../middleware/device-token-auth.js'

const router = Router()

const levelEnum = z.enum(['debug', 'info', 'warn', 'error'])

const ingestSchema = z.object({
  level: levelEnum.optional(),
  source: z.string().nullable().optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Tolerated but ignored — taken from token. */
  device_id: z.string().optional(),
})

const listQuerySchema = z.object({
  device_id: z.string().optional(),
  level: levelEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(1000).default(200),
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

router.post(
  '/',
  requireDeviceToken,
  validateBody(ingestSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      const result = await create('device_logs', {
        device_id: auth.deviceId,
        level: req.body.level ?? 'info',
        source: req.body.source ?? null,
        message: req.body.message,
        metadata: JSON.stringify(req.body.metadata ?? {}),
        created_at: new Date(),
      })
      const log = (result as { data: unknown }).data
      try {
        await broadcast(`logs:${auth.deviceId}`, 'log', { log })
      } catch (_error) {
        /* realtime is best-effort */
      }
      res.status(201).json(log)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { device_id, level, page, limit } = req.query as unknown as z.infer<
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
    if (level) where.push({ field: 'level', operator: '=', value: level })

    const logs = await findMany<Record<string, unknown>>('device_logs', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(logs)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/tail/:deviceId', async (req: Request, res: Response) => {
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
    const logs = await findMany<Record<string, unknown>>('device_logs', {
      where: [{ field: 'device_id', operator: '=', value: deviceId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    res.json(logs)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
