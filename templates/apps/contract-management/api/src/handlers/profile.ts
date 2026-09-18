/**
 * /api/profile/me — read and update the authenticated user's profile.
 *
 * The molecule user resource only allows updating `username`/`name`/`email`
 * via PATCH /users/:id. Vellum stores additional profile fields
 * (company, notification preferences, signature image, theme) in the
 * `oauthData` JSONB column and exposes them through this endpoint.
 *
 * GET returns the full profile shape consumed by Settings.tsx and the
 * dashboard greeting.
 *
 * PATCH merges the supplied fields into oauthData (does not overwrite
 * the whole blob) and updates the top-level `name` if provided.
 *
 * Both routes require auth.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

const router = Router()

const profileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(320).optional(),
  company: z.string().max(255).nullable().optional(),
  title: z.string().max(255).nullable().optional(),
  signatureName: z.string().max(255).nullable().optional(),
  notificationPreferences: z
    .object({
      contractSent: z.boolean().optional(),
      contractSigned: z.boolean().optional(),
      contractExpiring: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
    })
    .partial()
    .optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
})

interface UserRow {
  id: string
  email: string | null
  name: string | null
  oauthData: Record<string, unknown> | null
  planKey: string | null
}

router.use(authorizers.auth())

router.get('/me', async (_req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('user.notFound', undefined, { defaultValue: 'User not found' }) })
    return
  }
  const oauth = (user.oauthData ?? {}) as Record<string, unknown>
  res.json({
    id: user.id,
    email: user.email ?? '',
    name: user.name ?? '',
    company: typeof oauth.company === 'string' ? oauth.company : '',
    title: typeof oauth.title === 'string' ? oauth.title : '',
    signatureName: typeof oauth.signatureName === 'string' ? oauth.signatureName : '',
    notificationPreferences:
      typeof oauth.notificationPreferences === 'object' && oauth.notificationPreferences !== null
        ? (oauth.notificationPreferences as Record<string, boolean>)
        : { contractSent: true, contractSigned: true, contractExpiring: true, weeklyDigest: false },
    theme:
      typeof oauth.theme === 'string' ? (oauth.theme as 'light' | 'dark' | 'system') : 'system',
    planKey: user.planKey ?? 'starter',
  })
})

router.patch('/me', validateBody(profileSchema), async (req: Request, res: Response) => {
  const userId = res.locals.session.userId as string
  const body = req.body as z.infer<typeof profileSchema>

  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('user.notFound', undefined, { defaultValue: 'User not found' }) })
    return
  }

  const oauthData: Record<string, unknown> = {
    ...((user.oauthData ?? {}) as Record<string, unknown>),
  }

  if (body.company !== undefined) oauthData.company = body.company
  if (body.title !== undefined) oauthData.title = body.title
  if (body.signatureName !== undefined) oauthData.signatureName = body.signatureName
  if (body.theme !== undefined) oauthData.theme = body.theme
  if (body.notificationPreferences !== undefined) {
    const existing =
      typeof oauthData.notificationPreferences === 'object' &&
      oauthData.notificationPreferences !== null
        ? (oauthData.notificationPreferences as Record<string, boolean>)
        : {}
    oauthData.notificationPreferences = { ...existing, ...body.notificationPreferences }
  }

  const updates: Record<string, unknown> = { oauthData }
  if (body.name !== undefined) updates.name = body.name
  if (body.email !== undefined) updates.email = body.email

  await updateById('users', userId, updates)

  // Re-read so the response always reflects the persisted shape.
  const updated = (await findById<UserRow>('users', userId))!
  const merged = (updated.oauthData ?? {}) as Record<string, unknown>
  res.json({
    id: updated.id,
    email: updated.email ?? '',
    name: updated.name ?? '',
    company: typeof merged.company === 'string' ? merged.company : '',
    title: typeof merged.title === 'string' ? merged.title : '',
    signatureName: typeof merged.signatureName === 'string' ? merged.signatureName : '',
    notificationPreferences:
      typeof merged.notificationPreferences === 'object' && merged.notificationPreferences !== null
        ? (merged.notificationPreferences as Record<string, boolean>)
        : { contractSent: true, contractSigned: true, contractExpiring: true, weeklyDigest: false },
    theme:
      typeof merged.theme === 'string' ? (merged.theme as 'light' | 'dark' | 'system') : 'system',
    planKey: updated.planKey ?? 'starter',
  })
})

export default router
