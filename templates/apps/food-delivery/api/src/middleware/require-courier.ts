import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Courier allow-list. Set `COURIER_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses of vetted delivery drivers,
 * e.g. `COURIER_EMAILS=driver1@fleet.com,driver2@fleet.com`. Any signed-in
 * user whose account email is on this list is treated as a courier and is
 * lazily promoted to `is_courier = true` on first access so the column becomes
 * the durable source of truth thereafter. This is the opt-in / vetting step:
 * a freshly self-registered account is NOT a courier by default.
 */
const courierEmails = (process.env.COURIER_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface CourierUser {
  id?: string
  email?: string
  is_courier?: boolean
}

/**
 * Authorization gate for the courier-facing delivery board
 * (`/api/delivery/*`): the available-orders feed, accepting/claiming an order,
 * the driver's active + history lists, live location pings, and completion.
 *
 * A valid session alone is NOT sufficient — these endpoints expose every
 * customer's delivery details and let the caller claim and drive any order, so
 * the caller must be a vetted courier. Without this gate any ordinary shopper
 * could enumerate strangers' home addresses and hijack their deliveries.
 *
 * A courier is any user with `is_courier === true` on their `users` row, OR
 * whose account email is in the `COURIER_EMAILS` env allow-list (the vetting
 * step). Allow-listed users are durably promoted (`is_courier = true`) so the
 * column is the source of truth on subsequent requests.
 *
 * Fails closed: returns 401 when there is no authenticated session and 403
 * when the authenticated user is not a courier.
 */
export const requireCourier = async (
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

    const user = await findById<CourierUser>('users', userId)
    if (!user) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    if (user.is_courier === true) {
      next()
      return
    }

    const email = String(user.email ?? '').toLowerCase()
    if (email && courierEmails.includes(email)) {
      // Vetted courier — durably promote so the is_courier column is the
      // source of truth on subsequent requests. Best-effort: a write failure
      // must not lock a legitimate courier out of their own board.
      try {
        await updateById('users', userId, { is_courier: true })
      } catch (error) {
        logger.warn({ error }, 'Failed to persist courier role promotion')
      }
      next()
      return
    }

    res.status(403).json({
      error: t('delivery.courierRequired', undefined, {
        defaultValue: 'Courier access required.',
      }),
    })
  } catch (error) {
    logger.error('require-courier', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}
