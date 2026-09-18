/**
 * Profile handler — `/api/profile/me`. Persists per-app settings
 * (store branding, payout email, etc.) into `users.oauthData.dgs`,
 * so the Settings page survives reload across devices instead of
 * living in localStorage.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface DgsSettings {
  storeName?: string
  tagline?: string
  payoutEmail?: string
  brandColor?: string
}

const updateProfileSchema = z.object({
  storeName: z.string().max(120).optional(),
  tagline: z.string().max(240).optional(),
  payoutEmail: z.string().email().optional().or(z.literal('')),
  brandColor: z.string().max(32).optional(),
})

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('user.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    const oauthData = (user.oauthData as Record<string, unknown> | null | undefined) ?? {}
    const dgs = (oauthData.dgs as DgsSettings | undefined) ?? {}
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      planKey: user.planKey ?? 'free',
      settings: {
        storeName: dgs.storeName ?? '',
        tagline: dgs.tagline ?? '',
        payoutEmail: dgs.payoutEmail ?? '',
        brandColor: dgs.brandColor ?? '',
      },
    })
  } catch (err) {
    logger.error('profile.get', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/me', validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateProfileSchema>
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('user.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    const oauthData = { ...((user.oauthData as Record<string, unknown> | null | undefined) ?? {}) }
    const dgs: DgsSettings = { ...((oauthData.dgs as DgsSettings | undefined) ?? {}) }
    if (body.storeName !== undefined) dgs.storeName = body.storeName
    if (body.tagline !== undefined) dgs.tagline = body.tagline
    if (body.payoutEmail !== undefined) dgs.payoutEmail = body.payoutEmail
    if (body.brandColor !== undefined) dgs.brandColor = body.brandColor
    oauthData.dgs = dgs
    await updateById('users', userId, { oauthData })
    res.json({
      id: user.id,
      settings: {
        storeName: dgs.storeName ?? '',
        tagline: dgs.tagline ?? '',
        payoutEmail: dgs.payoutEmail ?? '',
        brandColor: dgs.brandColor ?? '',
      },
    })
  } catch (err) {
    logger.error('profile.update', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
