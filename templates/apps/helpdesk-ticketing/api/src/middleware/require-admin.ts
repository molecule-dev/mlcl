import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Helpdesk-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that operate this helpdesk,
 * e.g. `ADMIN_EMAILS=owner@helpdesk.com,ops@helpdesk.com`. Any signed-in
 * user whose account email is on this list is treated as an operator/admin
 * and is lazily promoted to `role = 'admin'` on first access so the column
 * becomes the durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface HelpdeskUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Resolve whether a user is a helpdesk operator/admin (role === 'admin' OR an
 * email on the `ADMIN_EMAILS` allow-list). Read-only check (no role promotion) —
 * used by owner-scoped surfaces (e.g. tickets) to decide whether the caller sees
 * the whole queue (operator) or only their own tickets (end customer).
 *
 * @param userId - The authenticated user id.
 * @returns True when the user is an operator/admin, false otherwise.
 */
export const isHelpdeskAdmin = async (userId: string): Promise<boolean> => {
  const user = await findById<HelpdeskUser>('users', userId)
  if (!user) return false
  if (user.role === 'admin') return true
  const email = String(user.email ?? '').toLowerCase()
  return Boolean(email && adminEmails.includes(email))
}

/**
 * Authorization gate for operator/admin surfaces: every *write* to the
 * shared, owner-less catalog/config tables — SLA policies (create/update/
 * delete), knowledge-base articles (create/update/delete) and automation
 * macros (create/update/delete). A valid session alone is NOT sufficient: these tables
 * have no per-user owner column, so any authenticated user (including an
 * end customer who just filed a ticket) could otherwise mutate the whole
 * org's SLA targets and operator content. The caller must be an operator.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR
 * whose account email is in the `ADMIN_EMAILS` env allow-list (the
 * designated helpdesk operator(s)). This closes the broken-access-control
 * default while leaving the legitimate operator flows fully functional.
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
        error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
      })
      return
    }

    const user = await findById<HelpdeskUser>('users', userId)
    if (!user) {
      res.status(401).json({
        error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }),
      })
      return
    }

    if (user.role === 'admin') {
      next()
      return
    }

    const email = String(user.email ?? '').toLowerCase()
    if (email && adminEmails.includes(email)) {
      // Designated operator — durably promote so the role column is the
      // source of truth on subsequent requests. Best-effort: a write
      // failure must not lock the operator out of their own dashboard.
      try {
        await updateById('users', userId, { role: 'admin' })
      } catch (error) {
        logger.warn({ error }, 'Failed to persist admin role promotion')
      }
      next()
      return
    }

    res.status(403).json({
      error: t('auth.forbidden', {}, { defaultValue: 'Administrator access required' }),
    })
  } catch (error) {
    logger.error('require-admin', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
}
