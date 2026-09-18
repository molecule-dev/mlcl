/**
 * Profile handler — owner-scoped reader/updater for the signed-in user's
 * display profile fields.
 *
 * Backed by `users` (canonical) plus `user_settings.organization` for
 * the team-name field shown in Settings → Account.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findOne, updateById, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id?: string
  name?: string | null
  email?: string | null
  username?: string | null
  createdAt?: string | Date | null
}

interface UserSettingsRow {
  user_id?: string
  organization?: string | null
}

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(1023).optional(),
  organization: z.string().max(255).optional(),
})

async function readSettings(userId: string): Promise<UserSettingsRow | null> {
  return await findOne<UserSettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
}

async function ensureSettings(userId: string): Promise<void> {
  const existing = await readSettings(userId)
  if (existing) return
  await create('user_settings', {
    user_id: userId,
    organization: '',
    preferences: JSON.stringify({}),
    integrations: JSON.stringify({}),
  })
}

function shapeProfile(user: UserRow, settings: UserSettingsRow | null): Record<string, unknown> {
  const joinedRaw = user.createdAt ?? null
  const joined =
    joinedRaw instanceof Date
      ? joinedRaw.toISOString().slice(0, 10)
      : typeof joinedRaw === 'string'
        ? joinedRaw.slice(0, 10)
        : null
  return {
    id: user.id ?? null,
    display_name: user.name ?? user.username ?? user.email ?? '',
    email: user.email ?? '',
    organization: settings?.organization ?? '',
    joined,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const user = await findById<UserRow>('users', userId)
  if (!user)
    return res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
  const settings = await readSettings(userId)
  res.json(shapeProfile(user, settings))
})

// `/me` is the canonical "current user profile" path so the frontend can use
// a stable URL without baking in the JWT user id. Mirrors the GET / above.
router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const user = await findById<UserRow>('users', userId)
  if (!user)
    return res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
  const settings = await readSettings(userId)
  res.json(shapeProfile(user, settings))
})

router.patch('/', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const user = await findById<UserRow>('users', userId)
  if (!user)
    return res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })

  const body = req.body as z.infer<typeof updateProfileSchema>
  const updates: Record<string, unknown> = {}
  if (typeof body.display_name === 'string') updates.name = body.display_name
  if (typeof body.email === 'string') updates.email = body.email
  if (Object.keys(updates).length > 0) {
    await updateById('users', userId, updates)
  }

  if (typeof body.organization === 'string') {
    await ensureSettings(userId)
    // user_settings PK is user_id (not id) — use updateMany.
    await updateMany('user_settings', [{ field: 'user_id', operator: '=', value: userId }], {
      organization: body.organization,
      updated_at: new Date(),
    })
  }

  // Re-read so the response reflects the canonical post-write state.
  const fresh = await findById<UserRow>('users', userId)
  const settings = await readSettings(userId)
  res.json(shapeProfile(fresh ?? user, settings))
})

router.patch('/me', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const user = await findById<UserRow>('users', userId)
  if (!user)
    return res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })

  const body = req.body as z.infer<typeof updateProfileSchema>
  const updates: Record<string, unknown> = {}
  if (typeof body.display_name === 'string') updates.name = body.display_name
  if (typeof body.email === 'string') updates.email = body.email
  if (Object.keys(updates).length > 0) {
    await updateById('users', userId, updates)
  }

  if (typeof body.organization === 'string') {
    await ensureSettings(userId)
    await updateMany('user_settings', [{ field: 'user_id', operator: '=', value: userId }], {
      organization: body.organization,
      updated_at: new Date(),
    })
  }

  const fresh = await findById<UserRow>('users', userId)
  const settings = await readSettings(userId)
  res.json(shapeProfile(fresh ?? user, settings))
})

export default router
