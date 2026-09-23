/**
 * Server-side channel for the signed-in user's photo-sharing preferences
 * (`oauthData.photoPrefs`).
 *
 * Why this exists: the platform user resource NEVER returns `oauthData`
 * on reads (GET /users/me strips it — it can hold provider tokens), even
 * though PATCH /users/:id persists it. A settings page that reads prefs
 * through /users/me therefore renders defaults after every reload and a
 * subsequent save clobbers the user's stored values with those defaults.
 * These routes read and merge the slice SERVER-side, so the client never
 * needs the raw blob.
 *
 * GET  /api/preferences  → `{ photoPrefs }` (stored values over defaults)
 * PATCH /api/preferences → merges the body's known keys into the stored
 *                          slice (partial updates never clear other keys)
 *                          and returns the merged `{ photoPrefs }`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface DbUser extends Record<string, unknown> {
  id: string
  oauthData: Record<string, unknown> | null
}

/** Mirror of the Settings page's DEFAULT_PREFS — keep both sides in sync. */
export const DEFAULT_PHOTO_PREFS = {
  bio: '',
  location: '',
  showExif: true,
  showLocation: true,
  watermarkLarge: false,
  allowDownload: false,
  publicProfile: true,
  searchable: true,
  blockAi: true,
  notifyFeatured: true,
  notifyComments: true,
  notifyFollows: false,
  weeklyDigest: true,
} as const

export type PhotoPrefs = Record<keyof typeof DEFAULT_PHOTO_PREFS, unknown> & {
  bio?: string
  location?: string
}

const prefsPatchSchema = z
  .object({
    bio: z.string().max(2000).optional(),
    location: z.string().max(255).optional(),
    showExif: z.boolean().optional(),
    showLocation: z.boolean().optional(),
    watermarkLarge: z.boolean().optional(),
    allowDownload: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
    searchable: z.boolean().optional(),
    blockAi: z.boolean().optional(),
    notifyFeatured: z.boolean().optional(),
    notifyComments: z.boolean().optional(),
    notifyFollows: z.boolean().optional(),
    weeklyDigest: z.boolean().optional(),
  })
  .strict()

type PrefsPatch = z.infer<typeof prefsPatchSchema>

/** Stored photoPrefs slice, or {} when the user has none yet. */
function storedPrefs(user: DbUser | null): Record<string, unknown> {
  const oauth = user?.oauthData
  if (!oauth || typeof oauth !== 'object') return {}
  const raw = (oauth as Record<string, unknown>).photoPrefs
  if (!raw || typeof raw !== 'object') return {}
  return raw as Record<string, unknown>
}

/** Merge stored values over the defaults — the view the settings UI renders. */
function mergedPrefs(stored: Record<string, unknown>): PhotoPrefs {
  return { ...DEFAULT_PHOTO_PREFS, ...stored } as PhotoPrefs
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<DbUser>('users', userId)
    if (!user) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    res.json({ photoPrefs: mergedPrefs(storedPrefs(user)) })
  } catch (err) {
    logger.error('preferences.read failed', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

router.patch('/', validateBody(prefsPatchSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<DbUser>('users', userId)
    if (!user) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const patch = req.body as PrefsPatch
    const oauth = (
      user.oauthData && typeof user.oauthData === 'object' ? user.oauthData : {}
    ) as Record<string, unknown>
    const current = storedPrefs(user)
    const nextPrefs = { ...current }
    for (const [key, value] of Object.entries(patch)) {
      if (value !== undefined) nextPrefs[key] = value
    }
    const nextOauth = { ...oauth, photoPrefs: nextPrefs }
    await updateById('users', userId, { oauthData: nextOauth, updatedAt: new Date() })
    res.json({ photoPrefs: mergedPrefs(nextPrefs) })
  } catch (err) {
    logger.error('preferences.update failed', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
