import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * League-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that run this league, e.g.
 * `ADMIN_EMAILS=commissioner@league.com,ops@league.com`. Any signed-in user
 * whose account email is on this list is treated as the league administrator
 * and is lazily promoted to `role = 'admin'` on first access so the column
 * becomes the durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface LeagueUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Resolve whether the given user is a league administrator.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated league
 * operator(s)). Allow-listed users are durably promoted to `role = 'admin'` so
 * the column is the source of truth on subsequent requests.
 *
 * Returns `false` when the user does not exist or is not an admin — it NEVER
 * falls open. Used both by the `requireAdmin` middleware (which admin-gates the
 * shared-league catalog writes) and by the owner-OR-admin team routes, where a
 * legitimate team owner may also write their own row.
 *
 * @param userId - The authenticated session user id.
 * @returns `true` when the user is a league administrator, else `false`.
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  const user = await findById<LeagueUser>('users', userId)
  if (!user) return false

  if (user.role === 'admin') return true

  const email = String(user.email ?? '').toLowerCase()
  if (email && adminEmails.includes(email)) {
    // Designated league operator — durably promote so the role column is the
    // source of truth on subsequent requests. Best-effort: a write failure
    // must not lock the operator out of their own dashboard.
    try {
      await updateById('users', userId, { role: 'admin' })
    } catch (error) {
      logger.warn({ error }, 'Failed to persist admin role promotion')
    }
    return true
  }

  return false
}

/**
 * Authorization gate for league-operator surfaces: every shared-league catalog
 * *write* (schedule, scores, live game events, players). A valid session alone
 * is NOT sufficient — these endpoints mutate the *shared* league data that
 * every fan reads, so the caller must be the designated league administrator.
 *
 * This closes the broken-access-control finding where the per-team owner check
 * fell OPEN whenever no owner was set (the demo league seeds `owner_user_id`
 * NULL), letting any authenticated user write league data. The owner-scoped
 * team routes use `isAdmin` directly instead, so a real team owner can still
 * edit their own team while the null-owner fall-open path is closed.
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
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    if (await isAdmin(userId)) {
      next()
      return
    }

    res.status(403).json({
      error: t('auth.forbidden', undefined, {
        defaultValue: 'You are not authorized to perform this action.',
      }),
    })
  } catch (error) {
    logger.error('require-admin', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}
