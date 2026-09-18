/**
 * Profile + preferences endpoints.
 *
 * The molecule user resource handles the canonical user CRUD; this thin
 * layer surfaces a `/api/profile/me` GET that returns the signed-in user
 * with structured preferences (currency, dateFormat, firstDayOfWeek,
 * theme, locale, notification toggles), and a PATCH that merges
 * preference updates into `users.oauthData.preferences` (which is the
 * conventional place per-app preferences live in molecule, since the
 * `users` table itself is owned by the molecule package).
 *
 * Returning preferences as a typed object — instead of forcing the
 * frontend to read individual columns — lets us add new preference keys
 * without schema migrations.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  email: string | null
  name: string | null
  username: string | null
  planKey: string | null
  oauthData: Record<string, unknown> | null
  createdAt: string | Date | null
}

const DEFAULT_PREFS = {
  currency: 'USD',
  dateFormat: 'MMM d, yyyy',
  firstDayOfWeek: 'Sunday',
  notifyBudgetOverspent: true,
  notifyGoalMilestones: true,
  notifyMonthlyReport: true,
}
type Prefs = typeof DEFAULT_PREFS

const prefSchema = z.object({
  currency: z.string().min(2).max(8).optional(),
  dateFormat: z.string().min(1).max(64).optional(),
  firstDayOfWeek: z.enum(['Sunday', 'Monday', 'Saturday']).optional(),
  notifyBudgetOverspent: z.boolean().optional(),
  notifyGoalMilestones: z.boolean().optional(),
  notifyMonthlyReport: z.boolean().optional(),
})

const profileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  preferences: prefSchema.optional(),
})

function readPrefs(row: UserRow): Prefs {
  const oauthData = (row.oauthData ?? {}) as Record<string, unknown>
  const stored = (oauthData.preferences ?? {}) as Partial<Prefs>
  return { ...DEFAULT_PREFS, ...stored }
}

function shape(row: UserRow): {
  id: string
  name: string
  email: string
  username: string
  planKey: string
  createdAt: string | null
  preferences: Prefs
} {
  return {
    id: row.id,
    name: row.name ?? '',
    email: row.email ?? '',
    username: row.username ?? '',
    planKey: row.planKey ?? 'free',
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
    preferences: readPrefs(row),
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const user = await findById<UserRow>('users', userId)
  if (!user)
    return res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'User not found.' }) })
  res.json(shape(user))
})

router.patch('/me', validateBody(profileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const existing = await findById<UserRow>('users', userId)
  if (!existing)
    return res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'User not found.' }) })

  const updates: Record<string, unknown> = {}
  if (req.body.name !== undefined) updates.name = req.body.name
  if (req.body.email !== undefined) updates.email = req.body.email
  if (req.body.preferences) {
    const oauthData = (existing.oauthData ?? {}) as Record<string, unknown>
    const currentPrefs = (oauthData.preferences ?? {}) as Partial<Prefs>
    updates.oauthData = {
      ...oauthData,
      preferences: { ...DEFAULT_PREFS, ...currentPrefs, ...req.body.preferences },
    }
  }
  if (Object.keys(updates).length === 0) {
    return res.json(shape(existing))
  }
  const result = await updateById('users', userId, updates)
  res.json(shape(result.data as unknown as UserRow))
})

export default router
