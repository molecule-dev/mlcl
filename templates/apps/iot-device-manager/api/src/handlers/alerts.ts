/**
 * Device alerts handler.
 *
 * All routes session-authenticated; all rows scoped by `owner_id`. Alerts
 * are typically created by other handlers (`commands.ts` on failure,
 * `firmware.ts` on rollout failure) plus the cron-driven offline /
 * anomaly evaluator (`POST /check`).
 *
 * The `POST /check` route evaluates simple threshold-based anomaly rules
 * + offline detection in v1; ML-based detection is deferred per INVENTORY.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const typeEnum = z.enum(['offline', 'anomaly', 'command_failed', 'firmware_failed', 'manual'])
const severityEnum = z.enum(['info', 'warning', 'error', 'critical'])
const statusEnum = z.enum(['open', 'acknowledged', 'resolved'])

const listQuerySchema = z.object({
  status: statusEnum.optional(),
  type: typeEnum.optional(),
  device_id: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

const createAlertSchema = z.object({
  device_id: z.string().nullable().optional(),
  type: typeEnum,
  severity: severityEnum.optional(),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const updateAlertSchema = z.object({
  status: statusEnum.optional(),
  severity: severityEnum.optional(),
  message: z.string().min(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const checkSchema = z.object({
  /** Minutes since `last_seen` past which a device is flagged offline. Default: 10. */
  offline_threshold_minutes: z.coerce.number().int().positive().max(10_080).default(10),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { status, type, device_id, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (type) where.push({ field: 'type', operator: '=', value: type })
    if (device_id) where.push({ field: 'device_id', operator: '=', value: device_id })

    const alerts = await findMany<Record<string, unknown>>('device_alerts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(alerts)
  } catch (_err) {
    logger.error('iot.alerts.request_failed', _err)
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
    const alert = await findById<Record<string, unknown>>('device_alerts', id)
    if (!alert || alert.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found.' }) })
    }
    res.json(alert)
  } catch (_err) {
    logger.error('iot.alerts.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/', validateBody(createAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { device_id, type, severity, message, metadata } = req.body
    // If a device id is supplied, it MUST be one of the user's devices.
    if (device_id) {
      const device = await findById<Record<string, unknown>>('iot_devices', device_id)
      if (!device || device.owner_id !== userId) {
        return res
          .status(404)
          .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
      }
    }
    const result = await create('device_alerts', {
      owner_id: userId,
      device_id: device_id ?? null,
      type,
      severity: severity ?? 'info',
      message,
      status: 'open',
      metadata: JSON.stringify(metadata ?? {}),
      acknowledged_at: null,
      resolved_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data: unknown }).data)
  } catch (_err) {
    logger.error('iot.alerts.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.put('/:id', validateBody(updateAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('device_alerts', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found.' }) })
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (updates.metadata && typeof updates.metadata === 'object') {
      updates.metadata = JSON.stringify(updates.metadata)
    }
    if (updates.status === 'acknowledged' && !existing.acknowledged_at) {
      updates.acknowledged_at = new Date()
    }
    if (updates.status === 'resolved' && !existing.resolved_at) {
      updates.resolved_at = new Date()
    }
    const result = await updateById('device_alerts', id, updates)
    res.json((result as { data: unknown }).data)
  } catch (_err) {
    logger.error('iot.alerts.request_failed', _err)
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
    const existing = await findById<Record<string, unknown>>('device_alerts', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found.' }) })
    }
    await deleteById('device_alerts', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('iot.alerts.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/**
 * Evaluate offline detection across the user's devices. Devices whose
 * `last_seen` is older than `offline_threshold_minutes` get a fresh
 * `offline` alert (deduplicated per device — only one open offline alert
 * per device at a time).
 *
 * Intended for cron invocation but exposed to the owner for manual runs.
 */
router.post('/check', validateBody(checkSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { offline_threshold_minutes } = req.body
    const cutoff = new Date(Date.now() - Number(offline_threshold_minutes) * 60_000)
    const devices = await findMany<Record<string, unknown>>('iot_devices', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      limit: 10_000,
    })
    const created: unknown[] = []
    for (const device of devices) {
      if (device.status === 'decommissioned') continue
      const lastSeenRaw = device.last_seen
      const lastSeen = lastSeenRaw ? new Date(String(lastSeenRaw)) : null
      const isOffline = !lastSeen || lastSeen < cutoff
      if (!isOffline) continue
      // Dedupe: skip if there's already an open offline alert for this device.
      const open = await findMany<{ id: string }>('device_alerts', {
        where: [
          { field: 'owner_id', operator: '=', value: userId },
          { field: 'device_id', operator: '=', value: String(device.id) },
          { field: 'type', operator: '=', value: 'offline' },
          { field: 'status', operator: '=', value: 'open' },
        ],
        limit: 1,
      })
      if (open.length > 0) continue
      const result = await create('device_alerts', {
        owner_id: userId,
        device_id: String(device.id),
        type: 'offline',
        severity: 'warning',
        message: t(
          'alerts.deviceOffline',
          { name: String(device.name) },
          {
            defaultValue: `Device "${String(device.name)}" is offline.`,
          },
        ),
        status: 'open',
        metadata: JSON.stringify({
          last_seen: lastSeen?.toISOString() ?? null,
          threshold_minutes: offline_threshold_minutes,
        }),
        acknowledged_at: null,
        resolved_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      created.push((result as { data: unknown }).data)
    }
    res.json({ created: created.length, alerts: created })
  } catch (_err) {
    logger.error('iot.alerts.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
