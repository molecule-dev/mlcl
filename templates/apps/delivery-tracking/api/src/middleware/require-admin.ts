import type { NextFunction, Request, Response } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that operate this delivery
 * service, e.g. `ADMIN_EMAILS=owner@carrier.com,ops@carrier.com`. Any
 * signed-in user whose account email is on this list is treated as an operator
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
 * Authorization gate for operator-managed reference data — specifically the
 * shipping-carrier *writes* (create / update / delete). A valid session alone
 * is NOT sufficient: carriers are global, tenant-shared records whose
 * `tracking_url_template` / `webhook_url` / `base_url` fields, if attacker
 * controlled, would redirect every user's tracking links (phishing) or
 * intercept carrier-integration traffic. So the caller must be a designated
 * operator (admin).
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated
 * operator(s)). This closes security finding P2H-3 (any authenticated user
 * could mutate carriers) while leaving the legitimate operator's flow fully
 * functional and the carrier reads available to all authenticated users.
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
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const user = await findById<AdminUser>('users', userId)
    if (!user) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    if (user.role === 'admin') {
      next()
      return
    }

    const email = String(user.email ?? '').toLowerCase()
    if (email && adminEmails.includes(email)) {
      // Designated operator — durably promote so the role column is the source
      // of truth on subsequent requests. Best-effort: a write failure must not
      // lock the operator out of their own carrier management.
      try {
        await updateById('users', userId, { role: 'admin' })
      } catch (error) {
        logger.warn?.(`require-admin: failed to persist admin role promotion: ${error}`)
      }
      next()
      return
    }

    res.status(403).json({
      error: t('auth.forbidden', undefined, {
        defaultValue: 'You do not have permission to perform this action.',
      }),
    })
  } catch (error) {
    logger.error?.(`require-admin failed: ${(error as Error)?.stack ?? error}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}
