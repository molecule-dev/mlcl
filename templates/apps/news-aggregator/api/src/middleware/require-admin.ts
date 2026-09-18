import type { NextFunction, Request, Response } from 'express'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Editor / operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that curate this news site, e.g.
 * `ADMIN_EMAILS=editor@news.com,ops@news.com`. Any signed-in user whose
 * account email is on this list is treated as an administrator and is lazily
 * promoted to `role = 'admin'` on first access so the column becomes the
 * durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface NewsUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Authorization gate for the shared, owner-less catalog/config: the global
 * `news_categories` taxonomy and the global `articles` story catalog (the
 * AI-summary cache lives on these shared rows). A valid session alone is NOT
 * sufficient — these endpoints mutate state that EVERY reader sees, so the
 * caller must be a designated administrator. Per-user reading-list /
 * bookmarks / interest rows are owner-scoped and must NOT use this gate.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated
 * editor(s)). This closes the broken-access-control default where any
 * authenticated user could create categories or overwrite the global article
 * summaries, while leaving the legitimate editor's workflow fully functional.
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

    const user = await findById<NewsUser>('users', userId)
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
      // Designated editor — durably promote so the role column is the source
      // of truth on subsequent requests. Best-effort: a write failure must not
      // lock the editor out of their own catalog.
      try {
        await updateById('users', userId, { role: 'admin' })
      } catch (error) {
        logger.warn({ error }, 'Failed to persist admin role promotion')
      }
      next()
      return
    }

    res.status(403).json({
      error: t('common.forbidden', undefined, { defaultValue: 'Forbidden' }),
    })
  } catch (error) {
    logger.error('require-admin', error)
    res.status(500).json({
      error: t('common.serverError', undefined, { defaultValue: 'Internal server error' }),
    })
  }
}
