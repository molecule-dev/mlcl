/**
 * IoT devices CRUD + per-device token management + heartbeat ingest.
 *
 * All session-authenticated queries are scoped by `owner_id`. The
 * `POST /:id/heartbeat` route is authenticated via `requireDeviceToken`;
 * its `device_id` comes from `res.locals.deviceAuth`, never the body.
 *
 * Search uses Meilisearch when configured; falls back to a SQL `ilike` via
 * findMany when search is unavailable.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import {
  generateDeviceToken,
  hashDeviceToken,
  requireDeviceToken,
} from '../middleware/device-token-auth.js'
import type { IotDeviceManagerLimits } from '../tiers.js'

const router = Router()

const deviceTypeEnum = z.enum(['sensor', 'gateway', 'actuator', 'controller', 'camera', 'other'])
const statusEnum = z.enum(['online', 'offline', 'provisioning', 'decommissioned'])

const createDeviceSchema = z.object({
  name: z.string().min(1),
  device_type: deviceTypeEnum.optional(),
  serial_number: z.string().nullable().optional(),
  firmware_version: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  device_type: deviceTypeEnum.optional(),
  serial_number: z.string().nullable().optional(),
  firmware_version: z.string().optional(),
  status: statusEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const listQuerySchema = z.object({
  status: statusEnum.optional(),
  device_type: deviceTypeEnum.optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
})

const createTokenSchema = z.object({
  label: z.string().optional(),
})

const heartbeatSchema = z.object({
  status: statusEnum.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { status, device_type, q, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: Array<{ field: string; operator: '=' | 'ilike'; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (device_type) where.push({ field: 'device_type', operator: '=', value: device_type })

    const devices = await findMany<Record<string, unknown>>('iot_devices', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit,
      offset: (page - 1) * limit,
    })

    if (q) {
      const needle = String(q).toLowerCase()
      const filtered = devices.filter((d) => {
        const name = String(d.name ?? '').toLowerCase()
        const serial = String(d.serial_number ?? '').toLowerCase()
        return name.includes(needle) || serial.includes(needle)
      })
      return res.json(filtered)
    }
    res.json(devices)
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { q } = req.query as unknown as z.infer<typeof searchQuerySchema>
    const all = await findMany<Record<string, unknown>>('iot_devices', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit: 500,
    })
    const needle = q.toLowerCase()
    const filtered = all.filter((d) => {
      const name = String(d.name ?? '').toLowerCase()
      const serial = String(d.serial_number ?? '').toLowerCase()
      return name.includes(needle) || serial.includes(needle)
    })
    res.json(filtered)
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const device = await findById<Record<string, unknown>>('iot_devices', id)
    if (!device || device.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }
    res.json(device)
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<IotDeviceManagerLimits>({
    limitType: 'maxDevices',
    getLimit: (limits) => limits.maxDevices,
    getCurrent: async (userId) =>
      count('iot_devices', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createDeviceSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })

      const { name, device_type, serial_number, firmware_version, metadata } = req.body
      const result = await create('iot_devices', {
        owner_id: userId,
        name,
        device_type: device_type ?? 'sensor',
        serial_number: serial_number ?? null,
        firmware_version: firmware_version ?? '0.0.0',
        status: 'offline',
        last_seen: null,
        metadata: JSON.stringify(metadata ?? {}),
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data: unknown }).data)
    } catch (_err) {
      logger.error('iot.devices.request_failed', _err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateDeviceSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('iot_devices', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (updates.metadata && typeof updates.metadata === 'object') {
      updates.metadata = JSON.stringify(updates.metadata)
    }
    const result = await updateById('iot_devices', id, updates)
    res.json((result as { data: unknown }).data)
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('iot_devices', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }
    await deleteById('iot_devices', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* ----------------------- per-device ingest tokens ----------------------- */

router.get('/:id/tokens', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const device = await findById<Record<string, unknown>>('iot_devices', id)
    if (!device || device.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }

    const tokens = await findMany<Record<string, unknown>>('device_tokens', {
      where: [
        { field: 'device_id', operator: '=', value: id },
        { field: 'owner_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    // Never expose the hash itself.
    res.json(
      tokens.map((row) => {
        const safe = { ...(row as Record<string, unknown>) }
        delete safe['token_hash']
        return safe
      }),
    )
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/tokens', validateBody(createTokenSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const device = await findById<Record<string, unknown>>('iot_devices', id)
    if (!device || device.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }

    const token = generateDeviceToken()
    const tokenHash = hashDeviceToken(token)
    const result = await create('device_tokens', {
      device_id: id,
      owner_id: userId,
      token_hash: tokenHash,
      label: req.body?.label ?? null,
      enabled: true,
      created_at: new Date(),
    })
    // Return the plaintext token ONCE — it is never recoverable later.
    const data = { ...(result as { data: Record<string, unknown> }).data }
    delete data['token_hash']
    res.status(201).json({ ...data, token })
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id/tokens/:tokenId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const tokenId = String(req.params.tokenId ?? '')
    const device = await findById<Record<string, unknown>>('iot_devices', id)
    if (!device || device.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }

    const tokenRow = await findById<Record<string, unknown>>('device_tokens', tokenId)
    if (!tokenRow || tokenRow.device_id !== id || tokenRow.owner_id !== userId) {
      return res.status(404).json({
        error: t('devices.tokenNotFound', undefined, { defaultValue: 'Token not found.' }),
      })
    }
    await updateById('device_tokens', tokenId, { enabled: false, revoked_at: new Date() })
    res.status(204).end()
  } catch (_err) {
    logger.error('iot.devices.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* ------------------------ device-side heartbeat ------------------------ */

router.post(
  '/:id/heartbeat',
  requireDeviceToken,
  validateBody(heartbeatSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      // Path id MUST match the token's device — defends against a compromised
      // token from being used to update a sibling device's status.
      const pathId = getParamId(req)
      if (pathId !== auth.deviceId) {
        return res.status(403).json({
          error: t('devices.tokenMismatch', undefined, {
            defaultValue: 'Token does not match device.',
          }),
        })
      }
      const updates: Record<string, unknown> = {
        status: req.body?.status ?? 'online',
        last_seen: new Date(),
        updated_at: new Date(),
      }
      if (req.body?.metadata) updates.metadata = JSON.stringify(req.body.metadata)
      const result = await updateById('iot_devices', auth.deviceId, updates)
      res.json((result as { data: unknown }).data)
    } catch (_err) {
      logger.error('iot.devices.request_failed', _err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

export default router
