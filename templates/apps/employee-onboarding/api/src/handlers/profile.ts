/**
 * Profile handler — GET /profile/me, PUT /profile/me, PATCH /profile/me.
 *
 * Returns the signed-in user's basic profile (id, email, name, firstName,
 * lastName) plus their primary onboarding metadata so a Profile page can
 * render personal info above onboarding progress without two calls. Updates
 * persist to the `users` table.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
  firstName?: string | null
  lastName?: string | null
  oauthData?: Record<string, unknown> | null
}

interface OnboardingRow {
  id: string
  employee_id: string
  start_date: Date | string | null
  status: string
}

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
})

async function projectProfile(user: UserRow): Promise<{
  user: {
    id: string
    email: string | null
    name: string | null
    firstName: string | null
    lastName: string | null
  }
  name: string | null
  onboarding: { id: string; start_date: Date | string | null; status: string } | null
}> {
  const onboarding = await findOne<OnboardingRow>('onboardings', [
    { field: 'employee_id', operator: '=', value: user.id },
  ])
  return {
    user: {
      id: user.id,
      email: user.email ?? null,
      name: user.name ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    },
    name: user.name ?? null,
    onboarding: onboarding
      ? {
          id: onboarding.id,
          start_date: onboarding.start_date,
          status: onboarding.status,
        }
      : null,
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('profile.notFound', undefined, { defaultValue: 'Profile not found' }) })
    return
  }
  res.json(await projectProfile(user))
})

async function applyProfileUpdate(req: Request, res: Response): Promise<void> {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof updateSchema>
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('profile.notFound', undefined, { defaultValue: 'Profile not found' }) })
    return
  }
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.firstName !== undefined) updates.firstName = body.firstName
  if (body.lastName !== undefined) updates.lastName = body.lastName
  if (body.email !== undefined) updates.email = body.email
  if (Object.keys(updates).length > 0) {
    await updateById('users', userId, updates)
  }
  const fresh = (await findById<UserRow>('users', userId)) ?? user
  res.json(await projectProfile(fresh))
}

router.put('/me', validateBody(updateSchema), applyProfileUpdate)
router.patch('/me', validateBody(updateSchema), applyProfileUpdate)

export default router
