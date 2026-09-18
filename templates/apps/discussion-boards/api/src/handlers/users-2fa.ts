/**
 * Per-app two-factor preference toggle for the discussion-boards (Stoa)
 * Settings page.
 *
 * The molecule user resource deliberately makes `twoFactorEnabled` NOT
 * writable through the generic `PATCH /api/users/:id` endpoint: that route
 * is gated only by `authSelf` (no TOTP step-up), so flipping the security
 * flag there would let a session disable 2FA without proving possession of
 * the second factor. The platform routes ALL real 2FA state transitions
 * through `POST /api/users/:id/verify-two-factor`, which verifies a live
 * TOTP token. (Posting `{ twoFactorEnabled }` to `PATCH /users/:id` is
 * silently stripped → the switch never persists; the M6-1 issue.)
 *
 * This app treats the Settings two-factor switch as a self-service account
 * *preference* (the user is already authenticated as themselves), so it
 * gets its own narrow, self-authed route that persists the flag on the
 * user row. `GET /users/me` (which returns the raw user row as `props`)
 * then reflects it, and the switch survives a reload.
 *
 * Route (requires an authenticated session — `verifyMiddleware()` runs at
 * the top of router.ts and populates `res.locals.session.userId`):
 *
 *   PATCH /users/me/two-factor   body: { enabled: boolean }
 *
 * The two-segment path (`/users/me/two-factor`) does not collide with the
 * default resource's `PATCH /users/:id` (one segment), so mount order is
 * irrelevant.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

interface UserRow {
  id: string
  twoFactorEnabled: boolean | null
}

const router = Router()

router.patch('/me/two-factor', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
    })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  if (typeof body.enabled !== 'boolean') {
    res.status(400).json({
      error: t('user.error.noUpdatableFields', undefined, {
        defaultValue: 'No updatable fields were provided.',
      }),
    })
    return
  }

  const user = (await findById('users', userId)) as UserRow | null
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }

  const result = await updateById<UserRow>('users', userId, {
    twoFactorEnabled: body.enabled,
    updatedAt: new Date().toISOString(),
  })

  res.json({ props: result.data })
})

export default router
