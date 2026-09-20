import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * City-staff allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that operate this 311 service
 * for Riverton, e.g. `ADMIN_EMAILS=ops@riverton.gov,streets@riverton.gov`.
 * Any signed-in user whose account email is on this list is treated as city
 * staff and is lazily promoted to `role = 'staff'` on first access so the
 * column becomes the durable source of truth thereafter. Ordinary
 * residents keep the default `role = 'resident'`.
 */
const staffEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface CivicUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Resolve whether a user is city staff (role === 'staff' OR an email on the
 * `ADMIN_EMAILS` allow-list). Read-only check (no role promotion) — used by
 * issue surfaces to decide whether the caller may advance the status
 * workflow and write official response notes, or is a regular resident.
 *
 * @param userId - The authenticated user id.
 * @returns True when the user is city staff, false otherwise.
 */
export const isCityStaff = async (userId: string): Promise<boolean> => {
  const user = await findById<CivicUser>('users', userId)
  if (!user) return false
  if (user.role === 'staff') return true
  const email = String(user.email ?? '').toLowerCase()
  return Boolean(email && staffEmails.includes(email))
}

/**
 * Authorization gate for city-staff surfaces: advancing an issue's status
 * through the workflow (submitted → acknowledged → in_review →
 * resolved/dismissed) and writing official response notes. A valid session
 * alone is NOT sufficient — those transitions are what residents read as
 * "the city responded", so only staff accounts may mint them.
 *
 * Staff is any user with `role === 'staff'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated
 * 311 operators). This closes the broken-access-control default while
 * leaving the legitimate staff flows fully functional.
 *
 * Returns 401 when there is no authenticated session and 403 when the
 * authenticated user is not staff.
 */
export const requireStaff = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
      })
      return
    }

    const user = await findById<CivicUser>('users', userId)
    if (!user) {
      res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
      })
      return
    }

    if (user.role === 'staff') {
      next()
      return
    }

    const email = String(user.email ?? '').toLowerCase()
    if (email && staffEmails.includes(email)) {
      // Designated staff — durably promote so the role column is the
      // source of truth on subsequent requests. Best-effort: a write
      // failure must not lock the operator out of their own dashboard.
      try {
        await updateById('users', userId, { role: 'staff' })
      } catch (error) {
        logger.warn({ error }, 'Failed to persist staff role promotion')
      }
      next()
      return
    }

    res.status(403).json({
      error: t('auth.forbidden', {}, { defaultValue: 'City staff access required' }),
    })
  } catch (error) {
    logger.error('require-staff', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
}
