import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

/**
 * The user's in-app preferences (home stop, currency, notification channel
 * toggles) live inside the users row's "oauthData" jsonb bag — the only
 * freeform JSON column on the shared user resource.
 *
 * The shared user resource deliberately STRIPS "oauthData" from every user
 * READ response (M18: OAuth provider tokens ride in that bag, so it is
 * denylisted in stripSensitiveUserColumns). Writes still persist it, but no
 * read ever returns it — so the app cannot rehydrate preferences from
 * GET /api/users/:id. This route is the app-owned read-back channel: it
 * reads/writes ONLY the `preferences` sub-object, server-side, and never
 * exposes the rest of the bag.
 */

const router = Router()

interface Preferences {
  home_stop?: string
  currency?: string
  notifications?: Record<string, boolean>
}

interface UserRow {
  id?: string
  oauthData?: Record<string, unknown> | null
}

const patchSchema = z.object({
  home_stop: z.string().max(8).optional(),
  currency: z.string().min(3).max(3).optional(),
  notifications: z.record(z.string(), z.boolean()).optional(),
})

function preferencesOf(user: UserRow | null): Preferences {
  const prefs = user?.oauthData?.preferences
  return prefs && typeof prefs === 'object' ? (prefs as Preferences) : {}
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<UserRow>('users', userId)
    res.json(preferencesOf(user))
  } catch (err) {
    console.error('[preferences.read] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', validateBody(patchSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.error.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const current = preferencesOf(user)
    const next: Preferences = {
      ...current,
      ...((req.body ?? {}) as Preferences),
    }
    await updateById('users', userId, {
      oauthData: { ...(user.oauthData ?? {}), preferences: next },
    })
    res.json(next)
  } catch (err) {
    console.error('[preferences.update] failed:', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
