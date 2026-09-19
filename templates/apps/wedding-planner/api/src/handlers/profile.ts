/**
 * Profile handler — GET/PATCH the signed-in user's profile.
 *
 * App-specific profile fields (firstName, lastName, displayName, bio,
 * theme, language, notification preferences) live inside oauthData.wp so
 * we don't need a separate `user_profiles` table. The Settings UI
 * round-trips the entire shape; we merge writes against the existing
 * oauthData.wp so partial updates don't blow away other fields.
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

interface ProfileShape {
  firstName?: string
  lastName?: string
  displayName?: string
  bio?: string
  theme?: 'light' | 'dark' | 'system'
  language?: string
  notifications?: {
    rsvpUpdates?: boolean
    taskReminders?: boolean
    budgetAlerts?: boolean
    marketing?: boolean
  }
}

const profileSchema = z.object({
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  displayName: z.string().max(120).optional(),
  bio: z.string().max(500).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().max(10).optional(),
  notifications: z
    .object({
      rsvpUpdates: z.boolean().optional(),
      taskReminders: z.boolean().optional(),
      budgetAlerts: z.boolean().optional(),
      marketing: z.boolean().optional(),
    })
    .optional(),
})

function readProfile(
  user: Record<string, unknown> | null,
): ProfileShape & { email: string | null } {
  const oauthData = (user?.oauthData as Record<string, unknown> | undefined) ?? {}
  const wp = (oauthData.wp as ProfileShape | undefined) ?? {}
  return {
    firstName: wp.firstName ?? '',
    lastName: wp.lastName ?? '',
    displayName: wp.displayName ?? (user?.name as string | undefined) ?? '',
    bio: wp.bio ?? '',
    theme: wp.theme ?? 'system',
    language: wp.language ?? 'en',
    notifications: {
      rsvpUpdates: wp.notifications?.rsvpUpdates ?? true,
      taskReminders: wp.notifications?.taskReminders ?? true,
      budgetAlerts: wp.notifications?.budgetAlerts ?? false,
      marketing: wp.notifications?.marketing ?? false,
    },
    email: (user?.email as string | null | undefined) ?? null,
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
    }
    res.json(readProfile(user))
  } catch (err) {
    logger.error('profile GET me failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/me', validateBody(profileSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
    }
    const oauthData = ((user.oauthData as Record<string, unknown> | undefined) ?? {}) as Record<
      string,
      unknown
    >
    const existingWp = (oauthData.wp as ProfileShape | undefined) ?? {}
    const merged: ProfileShape = {
      ...existingWp,
      ...req.body,
      notifications: {
        ...(existingWp.notifications ?? {}),
        ...((req.body as ProfileShape).notifications ?? {}),
      },
    }
    const writes: Record<string, unknown> = {
      oauthData: { ...oauthData, wp: merged },
    }
    const incoming = req.body as ProfileShape
    if (incoming.displayName) {
      writes.name = incoming.displayName
    } else if (incoming.firstName || incoming.lastName) {
      writes.name = [
        incoming.firstName ?? existingWp.firstName ?? '',
        incoming.lastName ?? existingWp.lastName ?? '',
      ]
        .filter(Boolean)
        .join(' ')
    }
    await updateById('users', userId, writes)
    const updated = await findById<Record<string, unknown>>('users', userId)
    res.json(readProfile(updated ?? null))
  } catch (err) {
    logger.error('profile PATCH me failed', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
