/**
 * Device commands handler — two distinct authn surfaces:
 *
 *   1. **Owner (GET, POST, /cancel)** — session-authenticated user.
 *      `device_id` ownership verified via the `iot_devices.owner_id` join.
 *      `POST /` creates a `pending` command and broadcasts on
 *      `commands:<device_id>` so the device's realtime listener picks it
 *      up immediately.
 *
 *   2. **Device (POST /:id/ack, POST /:id/complete)** — bearer-token
 *      authenticated. The token resolves the device; the path command id
 *      is verified to belong to that device. On `complete` with
 *      `error_message`, the command flips to `failed` AND a corresponding
 *      `device_alerts` row is created (alert type=`command_failed`).
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import { requireDeviceToken } from '../middleware/device-token-auth.js'
import type { IotDeviceManagerLimits } from '../tiers.js'

const router = Router()

const commandTypeRx = /^[a-z][a-z0-9_]{1,63}$/i
const priorityEnum = z.enum(['low', 'normal', 'high'])

const createCommandSchema = z.object({
  device_id: z.string().min(1),
  command_type: z.string().regex(commandTypeRx),
  payload: z.record(z.string(), z.unknown()).optional(),
  priority: priorityEnum.optional(),
})

const ackSchema = z.object({}).passthrough()
const completeSchema = z.object({
  result: z.unknown().optional(),
  error_message: z.string().optional(),
})

const listQuerySchema = z.object({
  device_id: z.string().optional(),
  status: z.enum(['pending', 'acknowledged', 'completed', 'failed', 'canceled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
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

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { device_id, status, page, limit } = req.query as unknown as z.infer<
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
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const commands = await findMany<Record<string, unknown>>('device_commands', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(commands)
  } catch (_err) {
    logger.error('iot.commands.request_failed', _err)
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
    const command = await findById<Record<string, unknown>>('device_commands', id)
    if (!command) {
      return res
        .status(404)
        .json({ error: t('commands.notFound', undefined, { defaultValue: 'Command not found.' }) })
    }
    if (!(await ownsDevice(userId, String(command.device_id)))) {
      return res
        .status(404)
        .json({ error: t('commands.notFound', undefined, { defaultValue: 'Command not found.' }) })
    }
    res.json(command)
  } catch (_err) {
    logger.error('iot.commands.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<IotDeviceManagerLimits>({
    limitType: 'maxCommands',
    getLimit: (limits) => limits.maxCommands,
    getCurrent: async (userId) =>
      count('device_commands', [
        { field: 'device_id', operator: 'in', value: await userDeviceIds(userId) },
      ]).catch(() => 0),
  }) as unknown as RequestHandler,
  validateBody(createCommandSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })

      const { device_id, command_type, payload, priority } = req.body
      if (!(await ownsDevice(userId, device_id))) {
        return res
          .status(404)
          .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
      }

      const result = await create('device_commands', {
        device_id,
        command_type,
        payload: JSON.stringify(payload ?? {}),
        priority: priority ?? 'normal',
        status: 'pending',
        result: null,
        error_message: null,
        acknowledged_at: null,
        completed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      const command = (result as { data: Record<string, unknown> }).data
      try {
        await broadcast(`commands:${device_id}`, 'command', { command })
      } catch (_error) {
        /* realtime is best-effort */
      }
      res.status(201).json(command)
    } catch (_err) {
      logger.error('iot.commands.request_failed', _err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const command = await findById<Record<string, unknown>>('device_commands', id)
    if (!command || !(await ownsDevice(userId, String(command.device_id)))) {
      return res
        .status(404)
        .json({ error: t('commands.notFound', undefined, { defaultValue: 'Command not found.' }) })
    }
    if (command.status !== 'pending') {
      return res.status(400).json({
        error: t('commands.cannotCancel', undefined, {
          defaultValue: 'Only pending commands can be cancelled.',
        }),
      })
    }
    const result = await updateById('device_commands', id, {
      status: 'canceled',
      updated_at: new Date(),
    })
    const updated = (result as { data: Record<string, unknown> }).data
    // Mirror the device-side status broadcasts (ack/complete/fail) so the owner's live command
    // view reflects the cancellation immediately instead of only after a refresh.
    try {
      await broadcast(`commands:${String(command.device_id)}:status`, 'status', {
        command: updated,
      })
    } catch (_error) {
      /* realtime is best-effort */
    }
    res.json(updated)
  } catch (_err) {
    logger.error('iot.commands.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* ----------------------- device-side ack/complete ----------------------- */

router.post(
  '/:id/ack',
  requireDeviceToken,
  validateBody(ackSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      const id = getParamId(req)
      const command = await findById<Record<string, unknown>>('device_commands', id)
      if (!command || command.device_id !== auth.deviceId) {
        return res.status(404).json({
          error: t('commands.notFound', undefined, { defaultValue: 'Command not found.' }),
        })
      }
      const result = await updateById('device_commands', id, {
        status: 'acknowledged',
        acknowledged_at: new Date(),
        updated_at: new Date(),
      })
      const updated = (result as { data: Record<string, unknown> }).data
      try {
        await broadcast(`commands:${auth.deviceId}:status`, 'status', { command: updated })
      } catch (_error) {
        /* realtime is best-effort */
      }
      res.json(updated)
    } catch (_err) {
      logger.error('iot.commands.request_failed', _err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.post(
  '/:id/complete',
  requireDeviceToken,
  validateBody(completeSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      const id = getParamId(req)
      const command = await findById<Record<string, unknown>>('device_commands', id)
      if (!command || command.device_id !== auth.deviceId) {
        return res.status(404).json({
          error: t('commands.notFound', undefined, { defaultValue: 'Command not found.' }),
        })
      }
      const errorMessage = req.body?.error_message ?? null
      const status = errorMessage ? 'failed' : 'completed'
      const result = await updateById('device_commands', id, {
        status,
        result:
          req.body?.result === undefined || req.body?.result === null
            ? null
            : JSON.stringify(req.body.result),
        error_message: errorMessage,
        completed_at: new Date(),
        updated_at: new Date(),
      })
      const updated = (result as { data: Record<string, unknown> }).data

      // On failure, raise an alert for the owner. Best-effort: we never block
      // the command-complete path on the alert insert.
      if (errorMessage) {
        try {
          await create('device_alerts', {
            owner_id: auth.ownerId,
            device_id: auth.deviceId,
            type: 'command_failed',
            severity: 'warning',
            message: t(
              'alerts.commandFailed',
              { commandType: String(command.command_type) },
              {
                defaultValue: `Command "${String(command.command_type)}" failed.`,
              },
            ),
            status: 'open',
            metadata: JSON.stringify({ command_id: id, error_message: errorMessage }),
            acknowledged_at: null,
            resolved_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
        } catch (_error) {
          /* alert creation is best-effort; command result already saved */
        }
      }
      try {
        await broadcast(`commands:${auth.deviceId}:status`, 'status', { command: updated })
      } catch (_error) {
        /* realtime is best-effort */
      }
      res.json(updated)
    } catch (_err) {
      logger.error('iot.commands.request_failed', _err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

export default router
