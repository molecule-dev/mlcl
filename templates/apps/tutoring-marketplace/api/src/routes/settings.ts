import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

/**
 * Server-side app-preferences channel (GET + PATCH /api/settings).
 *
 * The platform user resource NEVER returns `oauthData` on reads — it is on
 * the sensitive-column denylist (`stripSensitiveUserColumns`), so a PATCH to
 * `/api/users/me { oauthData }` persists but never reads back, and any client
 * that stores preferences there silently loses them on the next page load.
 *
 * This route is the app-owned round-trip: the client PATCHes its preference
 * slice here; the server merges it into the user row's `oauthData` blob
 * (namespaced under `appSettings` so it cannot collide with OAuth provider
 * data) and returns the merged slice. Only the whitelisted keys below ever
 * cross the boundary — the rest of the blob stays server-side.
 */
const router = Router()

const notificationPrefsSchema = z.object({
  sessionReminder: z.boolean().optional(),
  newReview: z.boolean().optional(),
  tutorMatches: z.boolean().optional(),
  productUpdates: z.boolean().optional(),
})

const patchSettingsSchema = z.object({
  notifications: notificationPrefsSchema.optional(),
  activeRole: z.enum(['student', 'tutor']).optional(),
})

type NotificationPrefs = z.infer<typeof notificationPrefsSchema>
type AppSettings = {
  notifications?: NotificationPrefs
  activeRole?: 'student' | 'tutor'
}

/** The namespaced slice inside the user row's `oauthData` JSON blob. */
function readSlice(user: Record<string, unknown> | null | undefined): AppSettings {
  const blob = user?.oauthData as Record<string, unknown> | null | undefined
  const slice = blob?.appSettings as AppSettings | undefined
  return slice && typeof slice === 'object' ? slice : {}
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
    const user = await findById<Record<string, unknown>>('users', userId)
    res.json(readSlice(user))
  } catch (err) {
    logger.error?.('settings.read', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', validateBody(patchSettingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof patchSettingsSchema>
    const user = await findById<Record<string, unknown>>('users', userId)
    const current = readSlice(user)
    const next: AppSettings = {
      ...current,
      ...(body.notifications
        ? { notifications: { ...current.notifications, ...body.notifications } }
        : {}),
      ...(body.activeRole ? { activeRole: body.activeRole } : {}),
    }
    const blob = (user?.oauthData as Record<string, unknown> | null | undefined) ?? {}
    await updateById('users', userId, { oauthData: { ...blob, appSettings: next } })
    res.json(next)
  } catch (err) {
    logger.error?.('settings.update', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
