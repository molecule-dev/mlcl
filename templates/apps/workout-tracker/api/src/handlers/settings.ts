/**
 * Settings channel — `GET /api/settings` + `PATCH /api/settings`.
 *
 * The Settings page and the shell's weight-unit hook drive their persisted
 * state from here. The platform user resource NEVER returns `oauthData` on
 * reads, so anything written through PATCH /api/users/:id inside `oauthData`
 * silently evaporates on the next GET — this channel reads and merges the
 * app's slice SERVER-SIDE instead (the fleet pattern: see ai-meeting-notes'
 * handlers/settings.ts).
 *
 * The app slice lives inside `users.oauthData` under `preferences`. A partial
 * PATCH shallow-merges over the stored slice, so toggling one notification
 * never resets the rest of the preferences.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  oauthData: Record<string, unknown> | null
}

const preferencesSchema = z
  .object({
    weightUnit: z.enum(['kg', 'lbs']).optional(),
    distanceUnit: z.enum(['km', 'mi']).optional(),
    restTimerSeconds: z.number().int().min(30).max(600).optional(),
    notifyRestTimer: z.boolean().optional(),
    notifyStreak: z.boolean().optional(),
    notifyPR: z.boolean().optional(),
    csvExport: z.boolean().optional(),
  })
  .strict()

const updateSchema = z.object({ preferences: preferencesSchema })

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function preferencesOf(user: UserRow | null): Record<string, unknown> {
  const raw = (user?.oauthData ?? {}) as { preferences?: unknown }
  return isObject(raw.preferences) ? raw.preferences : {}
}

async function loadUser(userId: string): Promise<UserRow | null> {
  return findById<UserRow>('users', userId)
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const user = await loadUser(userId)
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }
    res.json({ id: user.id, preferences: preferencesOf(user) })
  } catch (err) {
    logger.error('settings.read', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const existing = await loadUser(userId)
    if (!existing) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }

    // Merge the incoming slice over the stored one SERVER-SIDE so a partial
    // PATCH (a single toggle) never resets preferences it did not send — and
    // never clobbers unrelated oauthData keys a sibling feature wrote.
    const oauth = (existing.oauthData ?? {}) as Record<string, unknown>
    const next = {
      ...oauth,
      preferences: { ...preferencesOf(existing), ...req.body.preferences },
    }
    await query(`UPDATE public.users SET "oauthData" = $1::jsonb, "updatedAt" = $2 WHERE id = $3`, [
      JSON.stringify(next),
      new Date(),
      userId,
    ])

    res.json({ id: userId, preferences: preferencesOf({ ...existing, oauthData: next }) })
  } catch (err) {
    logger.error('settings.update', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
