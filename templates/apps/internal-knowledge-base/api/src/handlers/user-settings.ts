/**
 * User settings endpoint — the server-side slice for per-user app
 * preferences (notification + reading toggles).
 *
 * The platform user resource NEVER returns `oauthData` on reads, so the
 * Settings page cannot persist preferences through PATCH /users/:id —
 * the values would vanish on the next /users/me round-trip. This handler
 * is the app-owned channel the playbook-mandated fix routes through:
 *
 *   GET   /settings → { preferences: { notifications: {...}, reading: {...} } }
 *   PATCH /settings → merges the posted partial slice into the stored row
 *                     and returns the merged result.
 *
 * Storage: one `user_settings` row per user (`user_id` unique), created
 * lazily on first PATCH. GET returns an empty slice when no row exists —
 * the client merges over its own defaults.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { internalError, requireUser, validationError } from '@molecule/api-bonds-default-express'
import { create, findOne, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface UserSettingsRow {
  id: string
  user_id: string
  preferences: Record<string, unknown>
}

const booleanMap = z.record(z.string(), z.boolean())

// Both known slices are validated; unknown top-level keys are dropped so a
// malformed client cannot smuggle arbitrary JSON into the row.
const patchSchema = z.object({
  notifications: booleanMap.optional(),
  reading: booleanMap.optional(),
})

const mergeSlice = (
  stored: Record<string, unknown>,
  patch: z.infer<typeof patchSchema>,
): Record<string, unknown> => {
  const merged: Record<string, unknown> = { ...stored }
  if (patch.notifications) {
    merged.notifications = {
      ...(typeof stored.notifications === 'object' && stored.notifications !== null
        ? stored.notifications
        : {}),
      ...patch.notifications,
    }
  }
  if (patch.reading) {
    merged.reading = {
      ...(typeof stored.reading === 'object' && stored.reading !== null ? stored.reading : {}),
      ...patch.reading,
    }
  }
  return merged
}

const handler: RequestHandler = async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    const row = await findOne<UserSettingsRow>('user_settings', [
      { field: 'user_id', operator: '=', value: uid },
    ])
    res.json({ preferences: row?.preferences ?? {} })
  } catch (error) {
    internalError(res, error)
  }
}

const router = Router()

router.get('/', handler)

router.patch('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  try {
    const existing = await findOne<UserSettingsRow>('user_settings', [
      { field: 'user_id', operator: '=', value: uid },
    ])
    const next = mergeSlice(existing?.preferences ?? {}, parsed.data)
    if (existing) {
      await updateById('user_settings', existing.id, { preferences: next })
    } else {
      await create('user_settings', { user_id: uid, preferences: next })
    }
    logger.info('settings.updated', { userId: uid })
    res.json({ preferences: next })
  } catch (error) {
    logger.error('settings.update_failed', error)
    internalError(res, error)
  }
})

export default router
