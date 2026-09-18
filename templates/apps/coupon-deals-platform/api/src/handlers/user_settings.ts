import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const preferenceSchema = z.object({
  search_radius_km: z.number().min(0).max(500),
  favorite_categories: z.array(z.string()).max(50),
})

const notificationFlagsSchema = z.object({
  hot: z.boolean(),
  expiring: z.boolean(),
  redeemed: z.boolean(),
  new_merchant: z.boolean(),
})

const updateSchema = z.object({
  city: z.string().max(255).optional(),
  preferences: preferenceSchema.optional(),
  notification_prefs: notificationFlagsSchema.optional(),
})

interface UserSettingsRow {
  user_id: string
  city: string | null
  preferences: unknown
  notification_prefs: unknown
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const row = await findOne<UserSettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  res.json(
    row ?? {
      user_id: userId,
      city: null,
      preferences: { search_radius_km: 5, favorite_categories: [] },
      notification_prefs: {
        hot: true,
        expiring: true,
        redeemed: true,
        new_merchant: false,
      },
    },
  )
})

router.put('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })

  const existing = await findOne<UserSettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])

  const now = new Date()
  if (existing) {
    const result = await updateMany(
      'user_settings',
      [{ field: 'user_id', operator: '=', value: userId }],
      {
        ...(req.body.city !== undefined ? { city: req.body.city } : {}),
        ...(req.body.preferences !== undefined ? { preferences: req.body.preferences } : {}),
        ...(req.body.notification_prefs !== undefined
          ? { notification_prefs: req.body.notification_prefs }
          : {}),
        updated_at: now,
      },
    )
    res.json(result.data ?? result)
    return
  }

  const result = await create('user_settings', {
    user_id: userId,
    city: req.body.city ?? null,
    preferences: req.body.preferences ?? {
      search_radius_km: 5,
      favorite_categories: [],
    },
    notification_prefs: req.body.notification_prefs ?? {
      hot: true,
      expiring: true,
      redeemed: true,
      new_merchant: false,
    },
    created_at: now,
    updated_at: now,
  })
  res.status(201).json(result.data ?? result)
})

export default router
