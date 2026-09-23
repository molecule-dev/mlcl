/**
 * Preferences handler — server-side settings channel.
 *
 * The Settings page persists its toggles in `users.oauthData.preferences`
 * (the only freeform JSON column on the user row). The platform user
 * resource ACCEPTS `oauthData` on `PATCH /api/users/:id` but STRIPS it from
 * every read (`SENSITIVE_USER_COLUMNS`) — so a client that hydrates from
 * `GET /api/users/me` always sees the defaults and silently resets the
 * user's saved preferences on every reload. It also cannot read-merge
 * before writing, so a stale snapshot would CLOBBER unrelated oauthData
 * keys (e.g. an OAuth provider's profile bag).
 *
 * Both are fixed by doing the read AND the merge server-side, here:
 *
 * - `GET /api/preferences` → `{ preferences }` read straight from the DB row.
 * - `PATCH /api/preferences` body `{ preferences }` → merged into the
 *   EXISTING `oauthData` (never replacing the whole bag) and persisted.
 *
 * Authorization: both endpoints scope by `userId` from the session — a
 * caller can only ever touch its own row.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserOAuthData {
  preferences?: Record<string, unknown>
  [key: string]: unknown
}

const preferencesSchema = z.object({
  preferences: z.record(z.string(), z.boolean()),
})

/**
 * Resolves the session user id or responds 401. Returns `null` after
 * sending the response so callers can `return` early.
 */
function requireUserId(res: Response): string | null {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
    })
    return null
  }
  return userId
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const viewer = await findById<{ oauthData?: UserOAuthData }>('users', userId)
    const prefs = viewer?.oauthData?.preferences
    res.json({ preferences: prefs && typeof prefs === 'object' ? prefs : {} })
  } catch (error) {
    console.error('preferences.read', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', validateBody(preferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    const { preferences: incoming } = req.body as z.infer<typeof preferencesSchema>
    // Read-merge-write against the live row: never replace the whole
    // oauthData bag (it may carry unrelated keys), only the preferences slice.
    const viewer = await findById<{ oauthData?: UserOAuthData }>('users', userId)
    const existingOAuth =
      viewer?.oauthData && typeof viewer.oauthData === 'object' ? viewer.oauthData : {}
    const existingPrefs =
      existingOAuth.preferences && typeof existingOAuth.preferences === 'object'
        ? existingOAuth.preferences
        : {}
    const merged = { ...existingOAuth, preferences: { ...existingPrefs, ...incoming } }
    await updateById('users', userId, { oauthData: merged })
    res.json({ preferences: merged.preferences })
  } catch (error) {
    console.error('preferences.update', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
