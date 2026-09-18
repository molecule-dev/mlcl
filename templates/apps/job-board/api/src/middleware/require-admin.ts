import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Board-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that administer this job board,
 * e.g. `ADMIN_EMAILS=owner@board.com,ops@board.com`. Any signed-in user whose
 * account email is on this list is treated as a board administrator and is
 * lazily promoted to `role = 'admin'` on first access so the column becomes
 * the durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface BoardUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Authorization gate for the global `job_categories` taxonomy writes
 * (`POST`/`PUT`/`DELETE /categories`). The `job_categories` table has no
 * per-user owner column — it is a shared, admin-style taxonomy every job and
 * applicant sees — so a valid session alone is NOT sufficient to mutate it.
 * Without this gate, any authenticated user could rename, re-slug, or delete
 * categories the entire board depends on.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated board
 * owner(s)). Owner-scoped writes elsewhere (a user editing their own jobs,
 * applications, profile, saved jobs) are unaffected — only the shared taxonomy
 * is locked down here.
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

    const user = await findById<BoardUser>('users', userId)
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
      // Designated board owner — durably promote so the role column is the
      // source of truth on subsequent requests. Best-effort: a write failure
      // must not lock the owner out of administering their own board.
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
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
}
