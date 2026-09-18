/**
 * Per-user profile + preferences endpoints.
 *
 * The molecule `/api/users/:id` PATCH only accepts the canonical
 * `username | name | email` fields. This app needs to persist app-specific
 * profile fields (display name, bio) and notification preferences. We
 * stash them inside the `oauthData` JSONB column under a `pm` namespace
 * so other apps' user-rows aren't disturbed and the flagship's
 * Settings page round-trips through reload.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface UserRow {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: Record<string, unknown> | null
  planKey?: string | null
}

const preferencesSchema = z
  .object({
    bio: z.string().max(2000).nullish(),
    displayName: z.string().max(255).nullish(),
    emailNotifications: z.boolean().optional(),
    pushNotifications: z.boolean().optional(),
    taskAssignments: z.boolean().optional(),
    projectUpdates: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    language: z.string().max(8).optional(),
  })
  .partial()

const profileUpdateSchema = z
  .object({
    name: z.string().max(255).nullish(),
    email: z.string().email().nullish(),
    preferences: preferencesSchema.optional(),
  })
  .partial()

const DEFAULT_PREFERENCES = {
  bio: '',
  displayName: '',
  emailNotifications: true,
  pushNotifications: false,
  taskAssignments: true,
  projectUpdates: true,
  theme: 'light' as const,
  language: 'en',
}

const readPreferences = (row: UserRow): typeof DEFAULT_PREFERENCES => {
  const stored = (row.oauthData?.pm as Record<string, unknown> | undefined) ?? {}
  return { ...DEFAULT_PREFERENCES, ...stored }
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  try {
    const row = await findById<UserRow>('users', userId)
    if (!row) {
      res
        .status(404)
        .json({ error: t('user.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    res.json({
      id: row.id,
      name: row.name ?? '',
      email: row.email ?? '',
      planKey: row.planKey ?? 'free',
      preferences: readPreferences(row),
    })
  } catch (error) {
    logger.error('profile.read', error)
    res.status(500).json({
      error: t('profile.error.read', undefined, { defaultValue: 'Failed to load profile' }),
    })
  }
})

router.patch('/me', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const parsed = profileUpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues })
    return
  }
  try {
    const row = await findById<UserRow>('users', userId)
    if (!row) {
      res
        .status(404)
        .json({ error: t('user.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }

    const updates: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) updates.name = parsed.data.name
    if (parsed.data.email !== undefined) updates.email = parsed.data.email

    if (parsed.data.preferences) {
      const existingNs = (row.oauthData?.pm as Record<string, unknown> | undefined) ?? {}
      const nextNs = { ...existingNs, ...parsed.data.preferences }
      const oauthData = { ...(row.oauthData ?? {}), pm: nextNs }
      updates.oauthData = oauthData
    }

    if (Object.keys(updates).length === 0) {
      res.json({
        id: row.id,
        name: row.name ?? '',
        email: row.email ?? '',
        planKey: row.planKey ?? 'free',
        preferences: readPreferences(row),
      })
      return
    }

    await updateById('users', userId, updates)
    const fresh = (await findById<UserRow>('users', userId)) ?? row
    res.json({
      id: fresh.id,
      name: fresh.name ?? '',
      email: fresh.email ?? '',
      planKey: fresh.planKey ?? 'free',
      preferences: readPreferences(fresh),
    })
  } catch (error) {
    logger.error('profile.update', error)
    res.status(500).json({
      error: t('profile.error.update', undefined, { defaultValue: 'Failed to update profile' }),
    })
  }
})

export default router
