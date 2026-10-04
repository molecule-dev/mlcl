import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Inventory-operator gate for ai-travel-agent (Wayfarer) — the same pattern
 * subscription-box uses for its shared catalog: a user is an operator when
 * their `users` row carries `role = 'admin'`, or their account email is in
 * the `ADMIN_EMAILS` env allow-list (the designated service owner(s), lazily
 * promoted to the durable role on first match).
 *
 * Why flights need it: `POST /flights/:id/delay` mutates SHARED inventory —
 * one flight row is visible to every traveler, and delaying it forces every
 * booking on that flight through the automatic rebooking flow. A valid
 * session alone must NOT be able to do that (broken access control: any
 * signed-in user could disrupt other users' confirmed trips).
 *
 * The delay control is a DEMO AFFORDANCE for the rebooking flow: e2e and
 * demo operators elevate their own session via the dev-only
 * `POST /_test/promote-admin` endpoint (fail-closed on
 * `ENABLE_E2E_TEST_ENDPOINTS=true`; see handlers/_test.ts), or run with
 * `ADMIN_EMAILS` set to their address.
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
 * Decides whether an already-fetched user row is the inventory operator,
 * lazily promoting a designated `ADMIN_EMAILS` owner to a durable
 * `role = 'admin'` on first match. Best-effort promotion: a write failure
 * must not lock the owner out.
 */
async function isAdminFromRow(user: AdminUser, userId: string): Promise<boolean> {
  if (user.role === 'admin') {
    return true
  }

  const email = String(user.email ?? '').toLowerCase()
  if (email && adminEmails.includes(email)) {
    try {
      await updateById('users', userId, { role: 'admin' })
    } catch (error) {
      logger.warn('require-admin: failed to persist admin role promotion', error)
    }
    return true
  }

  return false
}

/**
 * Authorization gate for shared-inventory writes: 401 with no authenticated
 * session, 403 when the authenticated user is not an operator, `next()`
 * otherwise.
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
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }

    const user = await findById<AdminUser>('users', userId)
    if (!user) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }

    if (await isAdminFromRow(user, userId)) {
      next()
      return
    }

    res.status(403).json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
  } catch (error) {
    logger.error('require-admin', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
}
