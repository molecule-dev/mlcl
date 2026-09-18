/**
 * Notification preferences handler.
 *
 * Stores per-user toggles for in-app/email reminder categories. Falls back
 * to safe defaults when no row exists yet so the UI can render before
 * the user has touched anything.
 *
 * - All reads/writes scope by `user_id`.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const prefsSchema = z
  .object({
    meals: z.boolean().optional(),
    water: z.boolean().optional(),
    streak: z.boolean().optional(),
    weekly: z.boolean().optional(),
  })
  .strict()

interface PrefsRow {
  id: string
  user_id: string
  meals: boolean
  water: boolean
  streak: boolean
  weekly: boolean
}

const DEFAULTS = { meals: true, water: true, streak: false, weekly: true } as const

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const rows = await findMany<PrefsRow>('notification_preferences', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (rows.length === 0) {
    res.json({ ...DEFAULTS })
    return
  }
  const row = rows[0]
  res.json({
    meals: row.meals,
    water: row.water,
    streak: row.streak,
    weekly: row.weekly,
  })
})

router.put('/', validateBody(prefsSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as z.infer<typeof prefsSchema>
  const existing = await findMany<PrefsRow>('notification_preferences', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  if (existing.length === 0) {
    const result = await create<PrefsRow>('notification_preferences', {
      user_id: userId,
      meals: body.meals ?? DEFAULTS.meals,
      water: body.water ?? DEFAULTS.water,
      streak: body.streak ?? DEFAULTS.streak,
      weekly: body.weekly ?? DEFAULTS.weekly,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const created = result.data
    if (!created) {
      res.status(500).json({
        error: t('notificationPrefs.saveFailed', undefined, {
          defaultValue: 'Could not save preferences.',
        }),
      })
      return
    }
    res.json({
      meals: created.meals,
      water: created.water,
      streak: created.streak,
      weekly: created.weekly,
    })
    return
  }
  const row = existing[0]
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (body.meals !== undefined) updates.meals = body.meals
  if (body.water !== undefined) updates.water = body.water
  if (body.streak !== undefined) updates.streak = body.streak
  if (body.weekly !== undefined) updates.weekly = body.weekly
  const result = await updateById<PrefsRow>('notification_preferences', row.id, updates)
  const updated = result.data ?? row
  res.json({
    meals: updated.meals,
    water: updated.water,
    streak: updated.streak,
    weekly: updated.weekly,
  })
})

export default router
