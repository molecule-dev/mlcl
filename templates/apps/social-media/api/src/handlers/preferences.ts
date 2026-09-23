import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Server-side settings channel for the viewer's OWN preferences + bio.
 *
 * Why this exists: the platform user resource NEVER returns `oauthData` on
 * reads, so a client that PATCHes `users.oauthData.socialPreferences` can
 * write it but can never read it back — toggles reset on every reload and a
 * read-merge-write off `/api/users/:id` silently clobbers sibling keys (bio).
 * This channel reads and merges the `oauthData` slice SERVER-SIDE, where the
 * column is visible, and exposes only the two fields the app owns.
 */

const router = Router()

interface RawPrefsUser {
  oauthData?: Record<string, unknown> | null
}

const patchSchema = z.object({
  bio: z.string().max(2000).optional(),
  preferences: z.record(z.string(), z.boolean()).optional(),
})

function serialize(oauthData: Record<string, unknown> | null | undefined): {
  bio: string
  preferences: Record<string, boolean>
} {
  const oauth = oauthData ?? {}
  return {
    bio: typeof oauth.bio === 'string' ? oauth.bio : '',
    preferences:
      oauth.socialPreferences && typeof oauth.socialPreferences === 'object'
        ? (oauth.socialPreferences as Record<string, boolean>)
        : {},
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<RawPrefsUser>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    res.json(serialize(user.oauthData))
  } catch (error) {
    logger.error('preferences.get', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const user = await findById<RawPrefsUser>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    // Merge into the FULL existing oauthData so a preferences save never
    // clobbers bio (or any other slice) and vice versa.
    const oauthData: Record<string, unknown> = { ...(user.oauthData ?? {}) }
    if (parsed.data.bio !== undefined) {
      oauthData.bio = parsed.data.bio
    }
    if (parsed.data.preferences !== undefined) {
      const current =
        oauthData.socialPreferences && typeof oauthData.socialPreferences === 'object'
          ? (oauthData.socialPreferences as Record<string, boolean>)
          : {}
      oauthData.socialPreferences = { ...current, ...parsed.data.preferences }
    }
    await updateById('users', userId, { oauthData })
    res.json(serialize(oauthData))
  } catch (error) {
    logger.error('preferences.patch', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
