/**
 * Profile handler — `GET/PATCH /api/profile/me`.
 *
 * Persists app-specific preferences (theme, notification toggles,
 * shortcut prefs) inside `users.oauthData.cm` so we don't need a parallel
 * preferences table. The shared user resource handler already does the
 * heavy lifting on the core columns (name, email, planKey); this handler
 * exposes a single read endpoint that combines core + per-app settings,
 * and an update endpoint that round-trips through reload.
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

const togglesSchema = z.object({
  sync: z.boolean().optional(),
  autoEncrypt: z.boolean().optional(),
  desktopOverlay: z.boolean().optional(),
  menuBar: z.boolean().optional(),
  startAtLogin: z.boolean().optional(),
})

const profileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  email: z.string().trim().email().max(1023).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  toggles: togglesSchema.optional(),
})

const DEFAULT_TOGGLES = {
  sync: true,
  autoEncrypt: true,
  desktopOverlay: true,
  menuBar: false,
  startAtLogin: true,
}

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
  planKey?: string | null
  oauthData?: Record<string, unknown> | null
}

function project(user: UserRow): {
  id: string
  email: string | null
  name: string | null
  planKey: string
  theme: 'light' | 'dark' | 'system'
  toggles: typeof DEFAULT_TOGGLES
} {
  const oauthData = (user.oauthData as Record<string, unknown> | null) ?? {}
  const prefs = (oauthData.cm as Record<string, unknown> | undefined) ?? {}
  const toggles = {
    ...DEFAULT_TOGGLES,
    ...((prefs.toggles as Record<string, unknown> | undefined) ?? {}),
  }
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    planKey: (user.planKey as string | null) ?? 'free',
    theme: (prefs.theme as 'light' | 'dark' | 'system' | undefined) ?? 'system',
    toggles: toggles as typeof DEFAULT_TOGGLES,
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    res.json(project(user))
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const parsed = profileSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({
        error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
        issues: parsed.error.issues,
      })
      return
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }

    const body = parsed.data
    const oauthData = (user.oauthData as Record<string, unknown> | null) ?? {}
    const existingPrefs = (oauthData.cm as Record<string, unknown> | undefined) ?? {}

    const nextPrefs: Record<string, unknown> = { ...existingPrefs }
    if (body.theme !== undefined) nextPrefs.theme = body.theme
    if (body.toggles !== undefined) {
      nextPrefs.toggles = {
        ...((existingPrefs.toggles as Record<string, unknown>) ?? {}),
        ...body.toggles,
      }
    }

    const updates: Record<string, unknown> = {
      // jsonb columns must be JSON.stringify'd
      oauthData: JSON.stringify({ ...oauthData, cm: nextPrefs }),
      updatedAt: new Date(),
    }
    if (body.name !== undefined) updates.name = body.name
    if (body.email !== undefined) updates.email = body.email

    await updateById('users', userId, updates)

    const fresh = await findById<UserRow>('users', userId)
    if (!fresh) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    res.json(project(fresh))
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
