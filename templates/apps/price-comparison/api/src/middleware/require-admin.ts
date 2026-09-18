import type { NextFunction, Request, Response } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Catalog-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that own this app, e.g.
 * `ADMIN_EMAILS=owner@app.com,ops@app.com`. Any signed-in user whose account
 * email is on this list is treated as the catalog administrator and is lazily
 * promoted to `role = 'admin'` on first access so the column becomes the
 * durable source of truth thereafter.
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
 * Authorization gate for catalog-owner surfaces: every write to the *shared*
 * catalog/config (products, sources, product_variants, price_entries,
 * price_history). These tables have no per-user owner column — a single row is
 * visible to and consumed by every user of the app — so a valid session alone
 * is NOT sufficient. Without this gate any authenticated user could create or
 * deface products/sources, scribble arbitrary price entries, trigger source
 * fetches, install the price-fetch cron, or delete the entire catalog
 * (broken-access-control finding).
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated app
 * owner(s)). GET/read routes stay public/authenticated as before; only the
 * catalog writes are gated, leaving the legitimate operator's flow intact.
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
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const user = await findById<AdminUser>('users', userId)
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
      // Designated app owner — durably promote so the role column is the source
      // of truth on subsequent requests. Best-effort: a write failure must not
      // lock the owner out of their own catalog management.
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
