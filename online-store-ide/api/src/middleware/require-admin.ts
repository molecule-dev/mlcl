import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Store-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that own this store, e.g.
 * `ADMIN_EMAILS=owner@store.com,ops@store.com`. Any signed-in user whose
 * account email is on this list is treated as the store administrator and is
 * lazily promoted to `role = 'admin'` on first access so the column becomes
 * the durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface StoreUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Returns `true` when `user` is the store operator — either their `users.role`
 * is already `'admin'` or their account email is on the `ADMIN_EMAILS`
 * allow-list. When admitted via the allow-list, the role column is durably
 * promoted (best-effort) so it becomes the source of truth on subsequent
 * requests. A write failure must never lock the owner out, so promotion errors
 * are logged and swallowed.
 */
const promoteIfAdmin = async (user: StoreUser, userId: string): Promise<boolean> => {
  if (user.role === 'admin') return true

  const email = String(user.email ?? '').toLowerCase()
  if (email && adminEmails.includes(email)) {
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
 * Predicate form of {@link requireAdmin}: resolves `true` when `userId` is the
 * store administrator / owner, `false` otherwise (including when the user no
 * longer exists). This is the single-merchant store's MERCHANT identity — it
 * backs the `@molecule/api-resource-order` merchant authorizer so that only the
 * store operator, never a buyer, can drive an order's merchant lifecycle
 * (refund, ship, deliver, or cancel an already-progressed order). Like
 * `requireAdmin` it lazily promotes an `ADMIN_EMAILS` owner to `role = 'admin'`.
 */
export const isStoreAdmin = async (userId: string): Promise<boolean> => {
  const user = await findById<StoreUser>('users', userId)
  if (!user) return false
  return promoteIfAdmin(user, userId)
}

/**
 * Authorization gate for admin / store-owner surfaces: the `/admin` dashboard
 * API and every catalogue / order *write*. A valid session alone is NOT
 * sufficient — these endpoints expose or mutate *every* customer's data, so the
 * caller must be the designated store administrator.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated store
 * owner(s)). This closes the cross-customer reads/mutations in security
 * findings L2-1 (admin API) and L2-2 (catalogue writes) while leaving the
 * legitimate operator's dashboard fully functional.
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
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const user = await findById<StoreUser>('users', userId)
    if (!user) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    if (await promoteIfAdmin(user, userId)) {
      next()
      return
    }

    res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
  } catch (error) {
    logger.error('require-admin', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
}
