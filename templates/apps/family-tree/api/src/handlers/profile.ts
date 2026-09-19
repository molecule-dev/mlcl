/**
 * Profile handler — manages account-level fields that don't have their own
 * first-class table (display name, research preferences). Backed by the
 * user's `oauthData` JSONB column with structured top-level keys
 * (`profile`, `preferences`).
 *
 * Routes:
 *   GET    /api/profile/me  → flattened profile bundle for the page.
 *   PATCH  /api/profile/me  → deep-merge the supplied keys into oauthData
 *                             (the molecule user PATCH replaces oauthData
 *                             wholesale — this handler does the merge so
 *                             the frontend can send partial updates).
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  name?: string | null
  email?: string | null
  twoFactorEnabled?: boolean | null
  oauthData?: Record<string, unknown> | null
}

interface ProfileBundle {
  name: string
  email: string
  twoFactorEnabled: boolean
  profile: Record<string, unknown>
  preferences: Record<string, unknown>
}

function asObject(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

async function loadBundle(userId: string): Promise<ProfileBundle | null> {
  const user = await findById<UserRow>('users', userId)
  if (!user) return null
  const oauth = asObject(user.oauthData)
  return {
    name: user.name ?? '',
    email: user.email ?? '',
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
    profile: asObject(oauth.profile),
    preferences: asObject(oauth.preferences),
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const bundle = await loadBundle(userId)
    if (!bundle) return res.status(404).json({ error: 'User not found.' })
    res.json(bundle)
  } catch (error) {
    logger.error('profile.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
})

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'You must be logged in.' }),
      })
    }
    const body = req.body as z.infer<typeof updateSchema>
    const user = await findById<UserRow>('users', userId)
    if (!user) return res.status(404).json({ error: 'User not found.' })

    const currentOauth = asObject(user.oauthData)
    const nextOauth: Record<string, unknown> = { ...currentOauth }

    if (body.profile) {
      nextOauth.profile = { ...asObject(currentOauth.profile), ...body.profile }
    }
    if (body.preferences) {
      nextOauth.preferences = { ...asObject(currentOauth.preferences), ...body.preferences }
    }

    const update: Record<string, unknown> = { oauthData: nextOauth, updatedAt: new Date() }
    if (body.name) update.name = body.name

    await updateById('users', userId, update)
    const bundle = await loadBundle(userId)
    res.json(bundle)
  } catch (error) {
    logger.error('profile.handler', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, {
        defaultValue: 'Something went wrong. Please try again.',
      }),
    })
  }
})

export default router
