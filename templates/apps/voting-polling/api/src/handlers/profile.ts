/**
 * Profile handler — `GET/PATCH /api/profile/me`.
 *
 * Persists app-specific preferences (theme, language, notification
 * toggles, organization name) inside `users.oauthData.vp` so we don't
 * need a parallel preferences table. The shared user resource handler
 * already does the heavy lifting on the core columns (name, email,
 * planKey); this handler is purely about the app-scoped JSON blob.
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

const profileSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  organization: z.string().trim().max(255).optional().nullable(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().trim().max(16).optional(),
  notifications: z
    .object({
      poll_published: z.boolean().optional(),
      quorum_reached: z.boolean().optional(),
      new_question: z.boolean().optional(),
      weekly_digest: z.boolean().optional(),
    })
    .optional(),
})

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const oauthData = (user.oauthData as Record<string, unknown> | null) ?? {}
    const prefs = (oauthData.vp as Record<string, unknown> | undefined) ?? {}
    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      planKey: user.planKey ?? 'free',
      organization: prefs.organization ?? null,
      theme: prefs.theme ?? 'system',
      language: prefs.language ?? 'en',
      notifications: prefs.notifications ?? {
        poll_published: true,
        quorum_reached: true,
        new_question: true,
        weekly_digest: false,
      },
    })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/me', validateBody(profileSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const body = req.body as z.infer<typeof profileSchema>
    const oauthData = (user.oauthData as Record<string, unknown> | null) ?? {}
    const existingPrefs = (oauthData.vp as Record<string, unknown> | undefined) ?? {}

    const nextPrefs: Record<string, unknown> = { ...existingPrefs }
    if (body.organization !== undefined) nextPrefs.organization = body.organization
    if (body.theme !== undefined) nextPrefs.theme = body.theme
    if (body.language !== undefined) nextPrefs.language = body.language
    if (body.notifications !== undefined) {
      nextPrefs.notifications = {
        ...((existingPrefs.notifications as Record<string, unknown>) ?? {}),
        ...body.notifications,
      }
    }

    const updates: Record<string, unknown> = {
      // jsonb columns must be JSON.stringify'd
      oauthData: JSON.stringify({ ...oauthData, vp: nextPrefs }),
    }
    if (body.name !== undefined) updates.name = body.name

    await updateById('users', userId, updates)

    const fresh = await findById<Record<string, unknown>>('users', userId)
    const freshOauth = (fresh?.oauthData as Record<string, unknown> | null) ?? {}
    const freshPrefs = (freshOauth.vp as Record<string, unknown> | undefined) ?? {}
    res.json({
      id: fresh?.id,
      email: fresh?.email,
      name: fresh?.name,
      planKey: fresh?.planKey ?? 'free',
      organization: freshPrefs.organization ?? null,
      theme: freshPrefs.theme ?? 'system',
      language: freshPrefs.language ?? 'en',
      notifications: freshPrefs.notifications ?? {},
    })
  } catch (err) {
    logger.error(err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
