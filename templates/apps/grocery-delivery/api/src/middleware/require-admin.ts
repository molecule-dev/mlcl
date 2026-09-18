import type { NextFunction, Request, Response } from 'express'

import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { isStoreOperator, type StoreUser } from '../lib/store-operator.js'

/**
 * Authorization gate for admin / operator surfaces: every catalogue
 * (`products`) and delivery-slot *write*. A valid session alone is NOT
 * sufficient — these endpoints mutate GLOBAL, cross-tenant data (every
 * customer's delivery fees, capacity, availability, and product catalogue), so
 * the caller must be the designated store operator.
 *
 * Operator identity is resolved by {@link isStoreOperator} (the SAME predicate
 * the order-resource merchant authorizer uses): a user with `role === 'admin'`
 * on their `users` row, or whose account email is in the `ADMIN_EMAILS`
 * allow-list (lazily promoted to `role = 'admin'`). This blocks ordinary
 * shoppers from altering global delivery slots (zeroing fees, faking
 * availability, batch-insert DoS) and the product catalogue while leaving the
 * legitimate operator fully functional.
 *
 * Returns 401 when there is no authenticated session (or the session user no
 * longer exists) and 403 when the authenticated user is not an operator.
 */
export const requireAdmin = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (res.locals.session as { userId?: string } | undefined)?.userId
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const user = await findById<StoreUser>('users', userId)
    if (!user) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    if (await isStoreOperator(userId)) {
      next()
      return
    }

    res.status(403).json({
      error: t('auth.forbidden', undefined, { defaultValue: 'Administrator access required.' }),
    })
  } catch (error) {
    logger.error('require-admin', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}
