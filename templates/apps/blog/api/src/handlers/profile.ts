import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router({ mergeParams: true })

interface UserRow {
  id: string
  email?: string | null
  name?: string | null
  oauthData?: Record<string, unknown> | null
  username?: string | null
}

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  bio: z.string().max(2000).optional(),
  profileVisible: z.boolean().optional(),
  showEmail: z.boolean().optional(),
  newFollowers: z.boolean().optional(),
  commentsNotif: z.boolean().optional(),
  mentionsNotif: z.boolean().optional(),
})

// GET /users/public/:id — public author profile (limited to safe fields).
router.get('/users/public/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const user = await findById<UserRow>('users', id)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
    const profileVisible = oauthData.profileVisible !== false
    const showEmail = Boolean(oauthData.showEmail)
    const bio = typeof oauthData.bio === 'string' ? (oauthData.bio as string) : null
    if (!profileVisible) {
      res.json({ id: user.id, name: 'Anonymous', bio: null, email: null })
      return
    }
    res.json({
      id: user.id,
      name: user.name ?? user.username ?? null,
      email: showEmail ? user.email : null,
      bio,
      oauthData: { bio, profileVisible, showEmail },
    })
  } catch (err) {
    console.error('[profile.public]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// GET /profile/me — full profile of the current user
router.get('/profile/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
    res.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      preferences: {
        theme: (oauthData.theme as string) ?? 'system',
        fontSize: (oauthData.fontSize as string) ?? 'medium',
        bio: (oauthData.bio as string) ?? '',
        profileVisible: oauthData.profileVisible !== false,
        showEmail: Boolean(oauthData.showEmail),
        newFollowers: oauthData.newFollowers !== false,
        commentsNotif: oauthData.commentsNotif !== false,
        mentionsNotif: Boolean(oauthData.mentionsNotif),
      },
    })
  } catch (err) {
    console.error('[profile.me]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// PATCH /profile/preferences — persist UI settings + bio in oauthData
router.patch(
  '/profile/preferences',
  validateBody(preferencesSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const user = await findById<UserRow>('users', userId)
      if (!user) {
        res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
        return
      }
      const incoming = req.body as z.infer<typeof preferencesSchema>
      const oauthData = { ...((user.oauthData ?? {}) as Record<string, unknown>), ...incoming }
      await updateById('users', userId, { oauthData })
      res.json({
        ok: true,
        preferences: {
          theme: (oauthData.theme as string) ?? 'system',
          fontSize: (oauthData.fontSize as string) ?? 'medium',
          bio: (oauthData.bio as string) ?? '',
          profileVisible: oauthData.profileVisible !== false,
          showEmail: Boolean(oauthData.showEmail),
          newFollowers: oauthData.newFollowers !== false,
          commentsNotif: oauthData.commentsNotif !== false,
          mentionsNotif: Boolean(oauthData.mentionsNotif),
        },
      })
    } catch (err) {
      console.error('[profile.preferences]', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
