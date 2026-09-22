/**
 * Fleets handler — labelled groupings of `iot_devices` for rollout
 * targeting. Membership is many-to-many via `fleet_memberships`.
 *
 * All routes are session-authenticated and scoped by `owner_id` on both
 * sides of the join (fleet must be owned by the user; member device must
 * also be owned by the user).
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const createFleetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateFleetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

const addMemberSchema = z.object({
  device_id: z.string().min(1),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const fleets = await findMany<Record<string, unknown>>('fleets', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(fleets)
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
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
    const fleet = await findById<Record<string, unknown>>('fleets', id)
    if (!fleet || fleet.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('fleets.notFound', undefined, { defaultValue: 'Fleet not found.' }) })
    }
    const memberships = await findMany<{ device_id: string }>('fleet_memberships', {
      where: [{ field: 'fleet_id', operator: '=', value: id }],
      limit: 10_000,
    })
    res.json({ ...fleet, member_device_ids: memberships.map((m) => m.device_id) })
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/', validateBody(createFleetSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const { name, description, tags } = req.body
    const result = await create('fleets', {
      owner_id: userId,
      name,
      description: description ?? null,
      tags: JSON.stringify(tags ?? []),
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json((result as { data: unknown }).data)
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.put('/:id', validateBody(updateFleetSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('fleets', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('fleets.notFound', undefined, { defaultValue: 'Fleet not found.' }) })
    }
    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if (Array.isArray(updates.tags)) updates.tags = JSON.stringify(updates.tags)
    const result = await updateById('fleets', id, updates)
    res.json((result as { data: unknown }).data)
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
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
    const existing = await findById<Record<string, unknown>>('fleets', id)
    if (!existing || existing.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('fleets.notFound', undefined, { defaultValue: 'Fleet not found.' }) })
    }
    // Cascade: drop memberships first to avoid orphaned rows.
    const memberships = await findMany<{ id: string }>('fleet_memberships', {
      where: [{ field: 'fleet_id', operator: '=', value: id }],
      limit: 10_000,
    })
    for (const m of memberships) {
      try {
        await deleteById('fleet_memberships', m.id)
      } catch (_error) {
        /* per-membership delete is best-effort; fleet delete proceeds regardless */
      }
    }
    await deleteById('fleets', id)
    res.status(204).end()
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id/devices', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const fleet = await findById<Record<string, unknown>>('fleets', id)
    if (!fleet || fleet.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('fleets.notFound', undefined, { defaultValue: 'Fleet not found.' }) })
    }
    const memberships = await findMany<{ device_id: string }>('fleet_memberships', {
      where: [{ field: 'fleet_id', operator: '=', value: id }],
      limit: 10_000,
    })
    if (memberships.length === 0) return res.json([])
    const devices = await findMany<Record<string, unknown>>('iot_devices', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'id', operator: 'in', value: memberships.map((m) => m.device_id) },
      ],
      orderBy: [{ field: 'name', direction: 'asc' }],
    })
    res.json(devices)
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/devices', validateBody(addMemberSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const fleet = await findById<Record<string, unknown>>('fleets', id)
    if (!fleet || fleet.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('fleets.notFound', undefined, { defaultValue: 'Fleet not found.' }) })
    }
    const deviceId = String(req.body.device_id)
    const device = await findById<Record<string, unknown>>('iot_devices', deviceId)
    if (!device || device.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('devices.notFound', undefined, { defaultValue: 'Device not found.' }) })
    }
    // Idempotent: skip if already a member.
    const existing = await findMany<{ id: string }>('fleet_memberships', {
      where: [
        { field: 'fleet_id', operator: '=', value: id },
        { field: 'device_id', operator: '=', value: deviceId },
      ],
      limit: 1,
    })
    if (existing.length > 0) {
      return res.status(200).json({ id: existing[0].id, fleet_id: id, device_id: deviceId })
    }
    const result = await create('fleet_memberships', {
      fleet_id: id,
      device_id: deviceId,
      created_at: new Date(),
    })
    res.status(201).json((result as { data: unknown }).data)
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/:id/devices/:deviceId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const deviceId = String(req.params.deviceId ?? '')
    const fleet = await findById<Record<string, unknown>>('fleets', id)
    if (!fleet || fleet.owner_id !== userId) {
      return res
        .status(404)
        .json({ error: t('fleets.notFound', undefined, { defaultValue: 'Fleet not found.' }) })
    }
    const memberships = await findMany<{ id: string }>('fleet_memberships', {
      where: [
        { field: 'fleet_id', operator: '=', value: id },
        { field: 'device_id', operator: '=', value: deviceId },
      ],
      limit: 1,
    })
    if (memberships.length === 0) {
      return res.status(404).json({
        error: t('fleets.memberNotFound', undefined, { defaultValue: 'Membership not found.' }),
      })
    }
    await deleteById('fleet_memberships', memberships[0].id)
    res.status(204).end()
  } catch (_err) {
    logger.error('iot.fleets.request_failed', _err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
