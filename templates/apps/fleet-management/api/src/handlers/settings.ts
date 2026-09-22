/**
 * Settings handler — server-side persistence for the Settings page.
 *
 * The platform user resource NEVER returns `oauthData` on reads, so a
 * settings slice stored there silently reverts on every reload. This
 * channel persists the fleet-settings slice (organization profile, alert
 * thresholds, notification preferences) in `fleet_settings` — one row per
 * owner, lazily created on first PATCH — and merges it server-side so the
 * client only ever deals with plain settings objects.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { create, findMany, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface SettingsRow {
  id?: string
  owner_id?: string
  settings?: Record<string, unknown> | string | null
  updated_at?: string | Date | null
}

const fleetSettingsSchema = z.object({
  organizationName: z.string().max(200).optional(),
  timezone: z.string().max(100).optional(),
  dispatchHours: z.string().max(100).optional(),
  speedingThreshold: z.number().min(0).max(200).optional(),
  idleThreshold: z.number().min(0).max(600).optional(),
  fuelThreshold: z.number().min(0).max(100).optional(),
  detectHardBrake: z.boolean().optional(),
  detectHardAccel: z.boolean().optional(),
  notifySpeeding: z.boolean().optional(),
  notifyMaintenance: z.boolean().optional(),
  notifyGeofence: z.boolean().optional(),
  notifyWeekly: z.boolean().optional(),
})

const patchSchema = z.object({
  fleetSettings: fleetSettingsSchema.optional(),
})

function decodeJson(v: unknown): Record<string, unknown> {
  if (!v) return {}
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v) as unknown
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {}
    } catch (_error) {
      // Malformed JSON string — fall back to empty settings
      return {}
    }
  }
  if (typeof v === 'object') return v as Record<string, unknown>
  return {}
}

async function readSettings(userId: string): Promise<SettingsRow | null> {
  const rows = await findMany<SettingsRow>('fleet_settings', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 1,
  })
  return rows[0] ?? null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const row = await readSettings(userId)
    res.json({ fleetSettings: decodeJson(row?.settings) })
  } catch (err) {
    logger.error('[settings] read failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', validateBody(patchSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const body = req.body as z.infer<typeof patchSchema>
    const incoming = body.fleetSettings ?? {}
    // Merge with the stored slice so a partial PATCH never drops keys the
    // client did not send.
    const existing = decodeJson((await readSettings(userId))?.settings)
    const merged = { ...existing, ...incoming }
    const result = await updateMany(
      'fleet_settings',
      [{ field: 'owner_id', operator: '=', value: userId }],
      { settings: JSON.stringify(merged), updated_at: new Date() },
    )
    if (!result.affected) {
      await create('fleet_settings', {
        owner_id: userId,
        settings: JSON.stringify(merged),
      })
    }
    res.json({ fleetSettings: merged })
  } catch (err) {
    logger.error('[settings] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
