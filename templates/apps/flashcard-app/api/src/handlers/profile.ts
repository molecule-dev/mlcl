/**
 * User profile + study preferences (daily goal, theme).
 *
 * Reads from `users` (name/email) + `user_profiles` (daily_goal,
 * streaks, theme) and exposes a single GET /profile/me endpoint that
 * the Settings page consumes.
 *
 * PATCH /profile/me upserts user_profiles and updates users.name (so
 * the change persists across reload, the actual contract).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const themeEnum = z.enum(['system', 'light', 'dark'])

const patchSchema = z.object({
  name: z.string().min(0).max(255).optional(),
  daily_goal: z.coerce.number().int().min(1).max(2000).optional(),
  theme: themeEnum.optional(),
})

interface UserRow {
  id: string
  name?: string | null
  email?: string | null
  planKey?: string | null
}

interface ProfileRow {
  user_id: string
  current_streak?: number
  longest_streak?: number
  daily_goal?: number
  theme?: string
}

const ensureProfile = async (userId: string): Promise<ProfileRow> => {
  const matches = await findMany<ProfileRow>('user_profiles', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (matches[0]) return matches[0]
  await create('user_profiles', {
    user_id: userId,
    current_streak: 0,
    longest_streak: 0,
    total_reviews: 0,
    daily_goal: 20,
    theme: 'system',
    created_at: new Date(),
    updated_at: new Date(),
  })
  // Re-read so callers see the persisted row's defaults.
  const after = await findMany<ProfileRow>('user_profiles', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  return (
    after[0] ?? {
      user_id: userId,
      current_streak: 0,
      longest_streak: 0,
      daily_goal: 20,
      theme: 'system',
    }
  )
}

router.get('/me', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res.status(404).json({
      error: t('user.error.notFound', undefined, { defaultValue: 'User not found.' }),
    })
    return
  }
  const profile = await ensureProfile(userId)
  res.json({
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    plan_key: user.planKey ?? 'free',
    daily_goal: profile.daily_goal ?? 20,
    theme: profile.theme ?? 'system',
    current_streak: profile.current_streak ?? 0,
    longest_streak: profile.longest_streak ?? 0,
  })
})

router.patch(
  '/me',
  validateBody(patchSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof patchSchema>

    if (body.name !== undefined) {
      await updateById('users', userId, { name: body.name })
    }

    await ensureProfile(userId)
    const profileUpdates: Record<string, unknown> = { updated_at: new Date() }
    if (body.daily_goal !== undefined) profileUpdates.daily_goal = body.daily_goal
    if (body.theme !== undefined) profileUpdates.theme = body.theme
    if (Object.keys(profileUpdates).length > 1) {
      await updateMany(
        'user_profiles',
        [{ field: 'user_id', operator: '=', value: userId }],
        profileUpdates,
      )
    }

    const user = await findById<UserRow>('users', userId)
    const after = await ensureProfile(userId)
    res.json({
      id: userId,
      name: user?.name ?? '',
      email: user?.email ?? '',
      plan_key: user?.planKey ?? 'free',
      daily_goal: after.daily_goal ?? 20,
      theme: after.theme ?? 'system',
      current_streak: after.current_streak ?? 0,
      longest_streak: after.longest_streak ?? 0,
    })
  },
)

export default router
