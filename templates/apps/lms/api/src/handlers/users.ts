/**
 * App-specific user routes for LMS.
 *
 * The molecule core resource exposes `PATCH /api/users/:id` for username /
 * name / email updates and `PATCH /api/users/:id/password` for password
 * changes. This module adds:
 *
 * - `GET  /api/users/me`              — convenience self-lookup with
 *                                        merged preferences and the LMS
 *                                        plan snapshot. Used by the
 *                                        Settings page on hydrate.
 * - `PUT  /api/users/me/preferences`  — persists theme / language /
 *                                        notification toggles into
 *                                        `users.oauthData.preferences`
 *                                        (a JSON column already on the
 *                                        schema, no migration needed).
 *
 * Both routes are mounted under `/api/users/me/...` so the front-end
 * doesn't need to know its own `userId` to read/write preferences —
 * the handler resolves it from the JWT session in `res.locals`.
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

const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().min(2).max(10).optional(),
  notifyEmail: z.boolean().optional(),
  notifyCourseUpdates: z.boolean().optional(),
  notifyAssignments: z.boolean().optional(),
  notifyDiscussions: z.boolean().optional(),
  bio: z.string().max(2000).optional(),
})

type UserRow = {
  id: string
  name: string | null
  email: string | null
  oauthData: Record<string, unknown> | null
  planKey: string | null
  planExpiresAt: string | null
  planAutoRenews: boolean | null
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('users.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    const prefs = (user.oauthData as Record<string, unknown> | null)?.preferences as
      Record<string, unknown> | undefined
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      planKey: user.planKey,
      planExpiresAt: user.planExpiresAt,
      planAutoRenews: user.planAutoRenews,
      preferences: prefs ?? {},
    })
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('users.fetchError', undefined, { defaultValue: 'Failed to fetch user' }) })
  }
})

/**
 * Public-by-id user lookup.
 *
 * Used by `CourseHeader` (and any other UI that needs to display an
 * instructor / author identity from an `instructor_id` foreign key).
 *
 * The molecule core `GET /api/users/:id` route is `User.authSelf`, so a
 * student can only read their own user row — that means rendering
 * "Taught by ..." for a course owned by another instructor returns 401
 * and the UI shows the bare instructor_id.
 *
 * This endpoint requires authentication (the global `verifyMiddleware`
 * mounted in `App/router.ts` already enforces that) but not self-match.
 * It returns ONLY the minimal public profile — `id`, `name`, `email` — so
 * any authenticated caller can render an instructor/author identity (and,
 * e.g., a contact-the-instructor mailto). It NEVER leaks the sensitive
 * fields the full self record carries (`oauthData`, `planKey`,
 * `planExpiresAt`, `planAutoRenews`, password hash, etc.); a caller wanting
 * their own full record uses `GET /me` (self-scoped).
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  const meId = getUserId(res)
  if (!meId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const user = await findById<UserRow>('users', String(req.params.id))
    if (!user) {
      res
        .status(404)
        .json({ error: t('users.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
    })
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('users.fetchError', undefined, { defaultValue: 'Failed to fetch user' }) })
  }
})

router.put(
  '/me/preferences',
  validateBody(preferencesSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    try {
      const user = await findById<UserRow>('users', userId)
      if (!user) {
        res
          .status(404)
          .json({ error: t('users.notFound', undefined, { defaultValue: 'User not found' }) })
        return
      }
      const existing = (user.oauthData as Record<string, unknown> | null) ?? {}
      const prevPrefs = (existing.preferences as Record<string, unknown> | undefined) ?? {}
      const nextPrefs = { ...prevPrefs, ...req.body }
      const nextOauth = { ...existing, preferences: nextPrefs }
      await updateById('users', userId, { oauthData: nextOauth })
      res.json({ preferences: nextPrefs })
    } catch (error) {
      logger.error(error)
      res.status(500).json({
        error: t('users.updateError', undefined, {
          defaultValue: 'Failed to update preferences',
        }),
      })
    }
  },
)

export default router
