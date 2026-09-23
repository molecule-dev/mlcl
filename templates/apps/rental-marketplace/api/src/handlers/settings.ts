/**
 * Server-side settings channel.
 *
 * Wraps the molecule user resource with a thin per-app surface:
 *
 *   GET   /api/settings — merged settings (phone + notification preferences,
 *                         read out of the JSONB `oauthData` blob server-side)
 *   PATCH /api/settings — partial update of the same shape, merged into
 *                         `oauthData` and persisted on the users row
 *
 * This exists because the platform user resource never echoes `oauthData`
 * back on reads — a Settings page that round-trips phone/preferences through
 * PATCH /api/users/:id + useAuth() silently loses them on the next reload.
 * Here the read and the write both go through the database, so
 * read-after-write is the contract.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

interface OAuthDataShape {
  phone?: string
  preferences?: {
    pushEnabled?: boolean
    emailEnabled?: boolean
    priceDropAlerts?: boolean
  }
  [key: string]: unknown
}

interface UserRow {
  id: string
  name?: string | null
  email?: string | null
  oauthData?: OAuthDataShape | null
}

function mergedSettings(user: UserRow): {
  phone: string
  preferences: { pushEnabled: boolean; emailEnabled: boolean; priceDropAlerts: boolean }
} {
  const oauthData = (user.oauthData ?? {}) as OAuthDataShape
  return {
    phone: oauthData.phone ?? '',
    preferences: {
      pushEnabled: oauthData.preferences?.pushEnabled ?? true,
      emailEnabled: oauthData.preferences?.emailEnabled ?? true,
      priceDropAlerts: oauthData.preferences?.priceDropAlerts ?? true,
    },
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const user = await findById<UserRow>('users', userId)
    if (!user) return res.status(404).json({ error: t('profile.notFound') })

    res.json(mergedSettings(user))
  } catch (error) {
    console.error('[settings.get]', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

const preferencesSchema = z
  .object({
    pushEnabled: z.boolean().optional(),
    emailEnabled: z.boolean().optional(),
    priceDropAlerts: z.boolean().optional(),
  })
  .strict()
  .partial()

const patchSchema = z
  .object({
    phone: z.string().max(64).optional(),
    preferences: preferencesSchema.optional(),
  })
  .strict()

router.patch('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

    const parsed = patchSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({
        error: t('settings.error.invalidPayload', undefined, {
          defaultValue: 'Invalid settings payload',
        }),
        details: parsed.error.issues,
      })
    }

    const existing = await findById<UserRow>('users', userId)
    if (!existing) return res.status(404).json({ error: t('profile.notFound') })

    const oldOauth = (existing.oauthData ?? {}) as OAuthDataShape
    const oauthDataNext: OAuthDataShape = { ...oldOauth }

    if (parsed.data.phone !== undefined) {
      oauthDataNext.phone = parsed.data.phone
    }
    if (parsed.data.preferences) {
      oauthDataNext.preferences = { ...(oldOauth.preferences ?? {}), ...parsed.data.preferences }
    }

    await updateById('users', userId, { oauthData: oauthDataNext })

    res.json(mergedSettings({ ...existing, oauthData: oauthDataNext }))
  } catch (error) {
    console.error('[settings.patch]', error)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
