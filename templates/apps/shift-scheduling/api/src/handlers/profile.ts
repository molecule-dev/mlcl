/**
 * Profile endpoint — `GET /api/profile/me` and `PATCH /api/profile/me`.
 *
 * Reads/writes per-user app settings (theme, language) into
 * `users.oauthData.profile`, alongside the user's identity. Used by the
 * SettingsPanel and the theme toggle so preferences survive logout +
 * login across devices.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface UserRow {
  id: string
  email: string
  name?: string | null
  username?: string | null
  oauthData?: Record<string, unknown> | null
  planKey?: string | null
}

const patchSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(10).optional(),
  display_name: z.string().min(1).max(120).optional(),
  workspace_name: z.string().min(1).max(120).optional(),
})

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    return res
      .status(404)
      .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
  }
  const profile = ((user.oauthData ?? {}) as Record<string, unknown>).profile as
    Record<string, unknown> | undefined
  res.json({
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    plan_key: user.planKey ?? 'free',
    theme: (profile?.theme as string | undefined) ?? 'system',
    language: (profile?.language as string | undefined) ?? 'en',
    display_name: (profile?.display_name as string | undefined) ?? user.name ?? '',
    workspace_name: (profile?.workspace_name as string | undefined) ?? 'Shiftly',
  })
})

router.patch('/me', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId)
    return res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      errors: parsed.error.issues,
    })
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    return res
      .status(404)
      .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
  }
  const data: Record<string, unknown> = {}
  const oauthData: Record<string, unknown> = { ...(user.oauthData ?? {}) }
  const existingProfile = ((oauthData.profile as Record<string, unknown> | undefined) ??
    {}) as Record<string, unknown>
  const newProfile = { ...existingProfile, ...parsed.data }
  oauthData.profile = newProfile
  data.oauthData = oauthData
  if (parsed.data.display_name !== undefined) {
    data.name = parsed.data.display_name
  }
  await updateById('users', userId, data)
  const profile = newProfile
  res.json({
    id: user.id,
    email: user.email,
    name: (data.name as string | undefined) ?? user.name ?? null,
    plan_key: user.planKey ?? 'free',
    theme: (profile.theme as string | undefined) ?? 'system',
    language: (profile.language as string | undefined) ?? 'en',
    display_name: (profile.display_name as string | undefined) ?? user.name ?? '',
    workspace_name: (profile.workspace_name as string | undefined) ?? 'Shiftly',
  })
})

export default router
