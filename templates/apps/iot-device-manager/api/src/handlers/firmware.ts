/**
 * Firmware versions + rollouts.
 *
 * All routes are session-authenticated. Firmware versions and rollouts are
 * scoped by `owner_id`. A rollout can target an explicit `device_ids[]`
 * list, a `fleet_id` (devices joined via `fleet_memberships`), or both.
 *
 * On `POST /rollouts`:
 *   - Validates the firmware exists, is published, and is owned by the user.
 *   - Resolves the target device set (intersection of owner_id-scoped devices).
 *   - For each target device, creates a `firmware_update_tasks` row AND
 *     enqueues a `firmware_update` device command containing the
 *     `download_url` payload — the device polls / receives via realtime
 *     and runs the actual flash + reports back via `POST /commands/:id/complete`.
 *
 * The `POST /rollouts/:rolloutId/devices/:deviceId/status` route is
 * device-token authenticated and updates per-device task progress.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

import { requireDeviceToken } from '../middleware/device-token-auth.js'
import type { IotDeviceManagerLimits } from '../tiers.js'

const router = Router()

const statusEnum = z.enum(['draft', 'published', 'deprecated'])
const strategyEnum = z.enum(['immediate', 'canary', 'gradual'])

const createFirmwareSchema = z.object({
  version: z.string().min(1),
  device_type: z.string().min(1),
  release_notes: z.string().optional(),
  download_url: z.string().url().nullable().optional(),
  checksum: z.string().nullable().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
})

const updateFirmwareSchema = z.object({
  release_notes: z.string().optional(),
  download_url: z.string().url().nullable().optional(),
  checksum: z.string().nullable().optional(),
  file_size: z.coerce.number().int().nonnegative().optional(),
  status: statusEnum.optional(),
})

const listQuerySchema = z.object({
  device_type: z.string().optional(),
  status: statusEnum.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

const createRolloutSchema = z.object({
  firmware_id: z.string().min(1),
  device_ids: z.array(z.string()).optional(),
  fleet_id: z.string().nullable().optional(),
  strategy: strategyEnum.optional(),
})

const rolloutListQuerySchema = z.object({
  firmware_id: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'failed', 'canceled']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(500).default(50),
})

const rolloutStatusSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  error_message: z.string().nullable().optional(),
})

async function userDeviceIds(userId: string): Promise<string[]> {
  const rows = await findMany<{ id: string }>('iot_devices', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  return rows.map((r) => r.id)
}

async function fleetDeviceIds(userId: string, fleetId: string): Promise<string[]> {
  const fleet = await findById<Record<string, unknown>>('fleets', fleetId)
  if (!fleet || fleet.owner_id !== userId) return []
  const memberships = await findMany<{ device_id: string }>('fleet_memberships', {
    where: [{ field: 'fleet_id', operator: '=', value: fleetId }],
    limit: 10_000,
  })
  return memberships.map((m) => m.device_id)
}

/* --------------------------- firmware versions --------------------------- */

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { device_type, status, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: Array<{ field: string; operator: '='; value: unknown }> = [
      { field: 'owner_id', operator: '=', value: userId },
    ]
    if (device_type) where.push({ field: 'device_type', operator: '=', value: device_type })
    if (status) where.push({ field: 'status', operator: '=', value: status })

    const versions = await findMany<Record<string, unknown>>('firmware_versions', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset: (page - 1) * limit,
    })
    res.json(versions)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/**
 * Aggregate rollout view used by the Firmware page UI. Joins each rollout with
 * its firmware version for display, computes a campaign-style status:
 *  - `rolling`  — rollout is active and has at least one completed task
 *  - `pending`  — rollout is active but no tasks have completed yet
 *  - `current`  — rollout is completed
 *  - `failed`   — rollout has at least one failed task
 *
 * Plus a synthetic "current" entry per device_type representing the latest
 * `released_at` published version, with completion metrics derived from devices
 * already on that version.
 */
router.get('/campaigns', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    return res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
  }

  const rollouts = await findMany<Record<string, unknown>>('firmware_rollouts', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 500,
  })

  const versions = await findMany<Record<string, unknown>>('firmware_versions', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 500,
  })
  const versionsById = new Map<string, Record<string, unknown>>()
  for (const v of versions) versionsById.set(String(v.id), v)

  const campaigns: Array<Record<string, unknown>> = []

  for (const r of rollouts) {
    const fw = versionsById.get(String(r.firmware_id))
    const completed = Number(r.completed_count ?? 0)
    const failed = Number(r.failed_count ?? 0)
    const target = Number(r.target_count ?? 0)
    let status: 'rolling' | 'pending' | 'current' | 'failed'
    if (failed > 0 && completed + failed >= target && target > 0) status = 'failed'
    else if (String(r.status) === 'completed') status = 'current'
    else if (completed > 0) status = 'rolling'
    else status = 'pending'

    campaigns.push({
      id: String(r.id),
      version: fw ? String(fw.version) : '?',
      channel: 'stable',
      status,
      total_devices: target,
      completed_devices: completed,
      failed_devices: failed,
      released_at: fw?.released_at ?? r.created_at,
    })
  }

  // Add one "current" virtual campaign per device_type representing the latest
  // published version, so the Firmware page is non-empty before any rollouts
  // are created.
  const devices = await findMany<Record<string, unknown>>('iot_devices', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 100_000,
  })
  const latestPublishedByType = new Map<string, Record<string, unknown>>()
  for (const v of versions) {
    if (String(v.status) !== 'published') continue
    const type = String(v.device_type)
    const existing = latestPublishedByType.get(type)
    if (!existing) {
      latestPublishedByType.set(type, v)
    } else {
      const a = new Date(String(v.released_at ?? v.created_at)).getTime()
      const b = new Date(String(existing.released_at ?? existing.created_at)).getTime()
      if (a > b) latestPublishedByType.set(type, v)
    }
  }
  for (const [type, v] of latestPublishedByType) {
    const ofType = devices.filter((d) => String(d.device_type) === type)
    const completed = ofType.filter((d) => String(d.firmware_version) === String(v.version)).length
    campaigns.push({
      id: `current-${type}-${String(v.id)}`,
      version: String(v.version),
      channel: 'stable',
      status: 'current',
      total_devices: ofType.length,
      completed_devices: completed,
      failed_devices: 0,
      released_at: v.released_at ?? v.created_at,
    })
  }

  res.json(campaigns)
})

router.get(
  '/rollouts/list',
  validateQuery(rolloutListQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })

      const { firmware_id, status, page, limit } = req.query as unknown as z.infer<
        typeof rolloutListQuerySchema
      >
      const where: Array<{ field: string; operator: '='; value: unknown }> = [
        { field: 'owner_id', operator: '=', value: userId },
      ]
      if (firmware_id) where.push({ field: 'firmware_id', operator: '=', value: firmware_id })
      if (status) where.push({ field: 'status', operator: '=', value: status })

      const rollouts = await findMany<Record<string, unknown>>('firmware_rollouts', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
        offset: (page - 1) * limit,
      })
      res.json(rollouts)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const firmware = await findById<Record<string, unknown>>('firmware_versions', id)
    if (!firmware || firmware.owner_id !== userId) {
      return res.status(404).json({
        error: t('firmware.notFound', undefined, { defaultValue: 'Firmware version not found.' }),
      })
    }
    res.json(firmware)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/',
  enforceLimit<IotDeviceManagerLimits>({
    limitType: 'maxFirmware',
    getLimit: (limits) => limits.maxFirmware,
    getCurrent: async (userId) =>
      count('firmware_versions', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createFirmwareSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })

      const { version, device_type, release_notes, download_url, checksum, file_size } = req.body
      const result = await create('firmware_versions', {
        owner_id: userId,
        version,
        device_type,
        release_notes: release_notes ?? '',
        download_url: download_url ?? null,
        checksum: checksum ?? null,
        file_size: file_size ?? 0,
        status: 'draft',
        released_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json((result as { data: unknown }).data)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/:id', validateBody(updateFirmwareSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('firmware_versions', id)
    if (!existing || existing.owner_id !== userId) {
      return res.status(404).json({
        error: t('firmware.notFound', undefined, { defaultValue: 'Firmware version not found.' }),
      })
    }
    const result = await updateById('firmware_versions', id, {
      ...req.body,
      updated_at: new Date(),
    })
    res.json((result as { data: unknown }).data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const firmware = await findById<Record<string, unknown>>('firmware_versions', id)
    if (!firmware || firmware.owner_id !== userId) {
      return res.status(404).json({
        error: t('firmware.notFound', undefined, { defaultValue: 'Firmware version not found.' }),
      })
    }
    const result = await updateById('firmware_versions', id, {
      status: 'published',
      released_at: new Date(),
      updated_at: new Date(),
    })
    res.json((result as { data: unknown }).data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* ------------------------------ rollouts ------------------------------ */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

router.post('/rollouts', validateBody(createRolloutSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { firmware_id, device_ids, fleet_id, strategy } = req.body
    if (!UUID_RE.test(String(firmware_id))) {
      return res.status(404).json({
        error: t('firmware.notFound', undefined, { defaultValue: 'Firmware version not found.' }),
      })
    }
    const firmware = await findById<Record<string, unknown>>('firmware_versions', firmware_id)
    if (!firmware || firmware.owner_id !== userId) {
      return res.status(404).json({
        error: t('firmware.notFound', undefined, { defaultValue: 'Firmware version not found.' }),
      })
    }
    if (firmware.status !== 'published') {
      return res.status(400).json({
        error: t('firmware.notPublished', undefined, {
          defaultValue: 'Firmware must be published before rollout.',
        }),
      })
    }

    // Resolve targets — accept explicit device_ids and/or fleet membership.
    const ownedSet = new Set(await userDeviceIds(userId))
    const fromExplicit = (device_ids ?? []).filter((id: string) => ownedSet.has(id))
    const fromFleet = fleet_id ? await fleetDeviceIds(userId, fleet_id) : []
    const targets = Array.from(new Set<string>([...fromExplicit, ...fromFleet]))
    if (targets.length === 0) {
      return res.status(400).json({
        error: t('firmware.rolloutTargetsRequired', undefined, {
          defaultValue: 'At least one owned device id or a fleet with members is required.',
        }),
      })
    }

    const rollout = (await create('firmware_rollouts', {
      owner_id: userId,
      firmware_id,
      fleet_id: fleet_id ?? null,
      device_ids: JSON.stringify(targets),
      strategy: strategy ?? 'immediate',
      status: 'active',
      target_count: targets.length,
      completed_count: 0,
      failed_count: 0,
      progress_percent: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })) as { data: Record<string, unknown> }
    const rolloutRow = rollout.data

    // Per-device tasks + matching device commands. Each device gets a
    // `firmware_update` command with `download_url` payload — the device's
    // realtime listener picks it up and runs the update.
    for (const deviceId of targets) {
      try {
        await create('firmware_update_tasks', {
          rollout_id: rolloutRow.id,
          firmware_id,
          device_id: deviceId,
          status: 'pending',
          error_message: null,
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })
        const cmd = (await create('device_commands', {
          device_id: deviceId,
          command_type: 'firmware_update',
          payload: JSON.stringify({
            firmware_id,
            version: firmware.version,
            download_url: firmware.download_url,
            checksum: firmware.checksum,
            rollout_id: rolloutRow.id,
          }),
          priority: 'high',
          status: 'pending',
          result: null,
          error_message: null,
          acknowledged_at: null,
          completed_at: null,
          created_at: new Date(),
          updated_at: new Date(),
        })) as { data: Record<string, unknown> }
        try {
          await broadcast(`firmware:${deviceId}`, 'rollout', {
            firmware,
            rollout_id: rolloutRow.id,
          })
          await broadcast(`commands:${deviceId}`, 'command', { command: cmd.data })
        } catch (_error) {
          /* realtime is best-effort */
        }
      } catch (_error) {
        /* per-target failure recorded as a failed task; continue */
      }
    }
    res.status(201).json(rolloutRow)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/rollouts/:rolloutId/devices/:deviceId/status',
  requireDeviceToken,
  validateBody(rolloutStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const auth = res.locals.deviceAuth
      if (!auth) {
        return res.status(401).json({
          error: t('devices.invalidToken', undefined, { defaultValue: 'Invalid device token.' }),
        })
      }
      const rolloutId = String(req.params.rolloutId ?? '')
      const deviceId = String(req.params.deviceId ?? '')
      if (deviceId !== auth.deviceId) {
        return res.status(403).json({
          error: t('devices.tokenMismatch', undefined, {
            defaultValue: 'Token does not match device.',
          }),
        })
      }

      const tasks = await findMany<Record<string, unknown>>('firmware_update_tasks', {
        where: [
          { field: 'rollout_id', operator: '=', value: rolloutId },
          { field: 'device_id', operator: '=', value: deviceId },
        ],
        limit: 1,
      })
      const task = tasks[0]
      if (!task) {
        return res.status(404).json({
          error: t('firmware.taskNotFound', undefined, {
            defaultValue: 'Firmware update task not found.',
          }),
        })
      }

      const { status, error_message } = req.body
      const taskUpdates: Record<string, unknown> = {
        status,
        error_message: error_message ?? null,
        updated_at: new Date(),
      }
      if (status === 'completed' || status === 'failed') {
        taskUpdates.completed_at = new Date()
      }
      await updateById('firmware_update_tasks', String(task.id), taskUpdates)

      const rollout = await findById<Record<string, unknown>>('firmware_rollouts', rolloutId)
      if (rollout && rollout.owner_id === auth.ownerId) {
        let completed = Number(rollout.completed_count ?? 0)
        let failed = Number(rollout.failed_count ?? 0)
        if (status === 'completed') completed += 1
        else if (status === 'failed') failed += 1
        const target = Number(rollout.target_count ?? 0)
        const done = completed + failed
        const progress = target > 0 ? Math.min(100, Math.round((done * 100) / target)) : 100
        const rolloutUpdates: Record<string, unknown> = {
          completed_count: completed,
          failed_count: failed,
          progress_percent: progress,
          updated_at: new Date(),
        }
        if (done >= target) rolloutUpdates.status = failed > 0 ? 'failed' : 'completed'
        await updateById('firmware_rollouts', rolloutId, rolloutUpdates)
      }

      // On success, the device picks up the new firmware version.
      if (status === 'completed') {
        const firmware = await findById<Record<string, unknown>>(
          'firmware_versions',
          String(task.firmware_id),
        )
        if (firmware) {
          await updateById('iot_devices', deviceId, {
            firmware_version: firmware.version,
            updated_at: new Date(),
          })
        }
      } else if (status === 'failed') {
        try {
          await create('device_alerts', {
            owner_id: auth.ownerId,
            device_id: deviceId,
            type: 'firmware_failed',
            severity: 'error',
            message: t('alerts.firmwareFailed', undefined, {
              defaultValue: 'Firmware update failed.',
            }),
            status: 'open',
            metadata: JSON.stringify({
              rollout_id: rolloutId,
              error_message: error_message ?? null,
            }),
            acknowledged_at: null,
            resolved_at: null,
            created_at: new Date(),
            updated_at: new Date(),
          })
        } catch (_error) {
          /* alert creation is best-effort; task status already saved */
        }
      }
      res.json({ ok: true })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

export default router
