/**
 * Per-user app preferences — the server-side settings channel.
 *
 * The platform user resource (`/api/users/*`) NEVER returns `oauthData` on
 * reads, so notification / reading preferences cannot round-trip through it
 * (a PATCH "succeeds" but every GET comes back without the blob). This
 * handler owns the slice instead: preferences live in the app's own
 * `user_preferences` table (JSONB) and are read/merged SERVER-SIDE.
 *
 * Endpoints:
 *   GET   /api/preferences → full merged preference object (defaults filled)
 *   PATCH /api/preferences → merge a partial object into the stored blob,
 *                            returns the full merged result
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

/** The app's known preference keys — all boolean toggles driven by Settings. */
const preferencesSchema = z
  .object({
    breakingAlerts: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
    emailDigest: z.boolean().optional(),
    hideRead: z.boolean().optional(),
    biasBalanced: z.boolean().optional(),
    showBiasMeters: z.boolean().optional(),
  })
  .strict()

/** Defaults applied server-side so GET never returns a partial object. */
const DEFAULT_PREFERENCES = {
  breakingAlerts: true,
  dailyDigest: true,
  emailDigest: false,
  hideRead: false,
  biasBalanced: true,
  showBiasMeters: true,
} as const

type StoredPreferences = Partial<Record<keyof typeof DEFAULT_PREFERENCES, boolean>>

async function loadStored(userId: string): Promise<StoredPreferences> {
  const result = await query<{ preferences: StoredPreferences | null }>(
    `SELECT preferences FROM user_preferences WHERE user_id = $1::uuid`,
    [userId],
  )
  return result.rows[0]?.preferences ?? {}
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const stored = await loadStored(userId)
    res.json({ ...DEFAULT_PREFERENCES, ...stored })
  } catch (error) {
    logger.error('preferences.get', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', validateBody(preferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const patch = req.body as Record<string, boolean>
    // jsonb `||` merges the patch into whatever is stored (upsert) — the
    // merge happens server-side so concurrent writers cannot clobber keys
    // they did not send.
    const result = await query<{ preferences: StoredPreferences }>(
      `INSERT INTO user_preferences (user_id, preferences, "updatedAt")
       VALUES ($1::uuid, $2::jsonb, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         preferences = user_preferences.preferences || $2::jsonb,
         "updatedAt" = NOW()
       RETURNING preferences`,
      [userId, JSON.stringify(patch)],
    )
    const stored = result.rows[0]?.preferences ?? patch
    res.json({ ...DEFAULT_PREFERENCES, ...stored })
  } catch (error) {
    logger.error('preferences.patch', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
