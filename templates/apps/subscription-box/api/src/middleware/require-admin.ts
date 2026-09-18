import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Catalog-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that own this subscription
 * service, e.g. `ADMIN_EMAILS=owner@box.com,ops@box.com`. Any signed-in user
 * whose account email is on this list is treated as the catalog administrator
 * and is lazily promoted to `role = 'admin'` on first access so the column
 * becomes the durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface AdminUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Decides whether an already-fetched user row is the catalog admin / store
 * merchant, lazily promoting a designated `ADMIN_EMAILS` owner to a durable
 * `role = 'admin'` on first match. This is the single source of truth for the
 * role + allow-list + promotion decision, shared by {@link requireAdmin} and
 * {@link isAdminUser} so both gates stay in lock-step.
 *
 * @param user - The user row to evaluate.
 * @param userId - That user's id (used for the promotion write).
 * @returns `true` when the user is an admin / allow-listed owner.
 */
async function isAdminFromRow(user: AdminUser, userId: string): Promise<boolean> {
  if (user.role === 'admin') {
    return true
  }

  const email = String(user.email ?? '').toLowerCase()
  if (email && adminEmails.includes(email)) {
    // Designated service owner — durably promote so the role column is the
    // source of truth on subsequent requests. Best-effort: a write failure
    // must not lock the owner out of their own catalog management.
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
 * Predicate form of the admin gate: looks up `userId` and returns whether that
 * user is the catalog admin / store merchant — `role === 'admin'` on their
 * `users` row, or an `ADMIN_EMAILS`-allow-listed owner (who is lazily promoted).
 * Returns `false` when the user row no longer exists.
 *
 * This is the SAME mechanism {@link requireAdmin} enforces for the shared
 * catalog + fulfillment writes, exposed for non-middleware callers — notably the
 * order merchant authorizer (`src/order-merchant-authorizer.ts`). subscription-
 * box is a SINGLE-merchant service, so the merchant who drives an order's
 * lifecycle (confirm/process/ship/deliver/refund, cancel-after-pending) IS this
 * admin; reuse this rather than inventing a parallel role system.
 *
 * @param userId - The authenticated user id to check.
 * @returns `true` when the user is an admin / allow-listed owner.
 */
export async function isAdminUser(userId: string): Promise<boolean> {
  const user = await findById<AdminUser>('users', userId)
  if (!user) {
    return false
  }
  return isAdminFromRow(user, userId)
}

/**
 * Authorization gate for catalog-owner surfaces: every write to the *shared*
 * `subscription_plans` catalog. That table has no per-user owner column — a
 * single plan row is visible to and purchasable by every customer — so a valid
 * session alone is NOT sufficient. Without this gate any authenticated user
 * could create bogus plans, mutate a plan's `price`/`features`, or archive the
 * entire pricing catalog (broken-access-control: a global/shared catalog table
 * writable by any signed-in user).
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated service
 * owner(s)). GET routes stay public; only the writes are gated, leaving the
 * legitimate operator's plan-management flow intact.
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
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const user = await findById<AdminUser>('users', userId)
    if (!user) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    if (await isAdminFromRow(user, userId)) {
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
