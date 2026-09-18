/**
 * Profile handler — owner-scoped GET + PATCH on the signed-in user's
 * Verso-specific preferences (theme, line-height, serif body, graph hover
 * preview, realtime sync) plus core display name + email.
 *
 * Persistence: app-specific preferences live in `users.oauthData.verso` so
 * we don't need to add columns. Core fields (name, email) round-trip
 * through the standard users row.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { internalError, requireUser, validationError } from '../lib/authz.js'

interface VersoPrefs {
  theme?: 'light' | 'dark' | 'sepia'
  serifBody?: boolean
  graphHoverPreview?: boolean
  realtimeSync?: boolean
  lineHeightPercent?: number
}

interface UserRow {
  id: string
  name: string | null
  email: string | null
  oauthData: { verso?: VersoPrefs } | null
  planKey: string | null
  planExpiresAt: string | null
}

const router = Router()

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'sepia']).optional(),
      serifBody: z.boolean().optional(),
      graphHoverPreview: z.boolean().optional(),
      realtimeSync: z.boolean().optional(),
      lineHeightPercent: z.number().min(120).max(220).optional(),
    })
    .optional(),
})

const DEFAULT_PREFS: Required<VersoPrefs> = {
  theme: 'light',
  serifBody: true,
  graphHoverPreview: true,
  realtimeSync: true,
  lineHeightPercent: 170,
}

const project = (
  user: UserRow,
): {
  id: string
  name: string | null
  email: string | null
  planKey: string | null
  preferences: Required<VersoPrefs>
} => {
  const stored = (user.oauthData?.verso ?? {}) as VersoPrefs
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    planKey: user.planKey,
    preferences: { ...DEFAULT_PREFS, ...stored },
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const user = await findById<UserRow>('users', ownerId)
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  res.json(project(user))
})

router.patch('/me', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    validationError(res, parsed.error.issues)
    return
  }
  const user = await findById<UserRow>('users', ownerId)
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const patch: Partial<UserRow> = {}
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.preferences !== undefined) {
    const next = {
      ...(user.oauthData ?? {}),
      verso: { ...(user.oauthData?.verso ?? {}), ...parsed.data.preferences },
    }
    patch.oauthData = next as UserRow['oauthData']
  }
  if (Object.keys(patch).length === 0) {
    res.json(project(user))
    return
  }
  try {
    const result = await updateById<UserRow>('users', ownerId, patch)
    const next = result.data ?? { ...user, ...patch }
    res.json(project(next as UserRow))
  } catch (error) {
    internalError(res, error)
  }
})

export default router
