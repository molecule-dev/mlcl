import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Platform-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that operate this platform, e.g.
 * `ADMIN_EMAILS=owner@coupons.com,ops@coupons.com`. Any signed-in user whose
 * account email is on this list is treated as the platform administrator and is
 * lazily promoted to `role = 'admin'` on first access so the column becomes the
 * durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface PlatformUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Authorization gate for the global catalog write surfaces: creating, updating
 * and deleting `categories` rows. A valid session alone is NOT sufficient — the
 * `categories` table is a shared, global taxonomy with no per-user owner column,
 * so any authenticated user could otherwise mutate every other user's category
 * listing. The caller must be a designated platform administrator.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated platform
 * owner(s)). This closes the broken-access-control default on the category write
 * routes while leaving the legitimate operator's admin flow fully functional and
 * leaving owner-scoped writes (deals via merchants.user_id) untouched.
 *
 * Returns 401 when there is no authenticated session and 403 when the
 * authenticated user is not an admin.
 */
export const requireAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const user = await findById<PlatformUser>('users', userId)
    if (!user) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    if (user.role === 'admin') {
      next()
      return
    }

    const email = String(user.email ?? '').toLowerCase()
    if (email && adminEmails.includes(email)) {
      // Designated platform owner — durably promote so the role column is the
      // source of truth on subsequent requests. Best-effort: a write failure
      // must not lock the owner out of their own admin flow.
      try {
        await updateById('users', userId, { role: 'admin' })
      } catch (error) {
        logger.warn({ error }, 'Failed to persist admin role promotion')
      }
      next()
      return
    }

    res.status(403).json({ error: t('auth.forbidden', {}, { defaultValue: 'Forbidden' }) })
  } catch (error) {
    logger.error('require-admin', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
}
