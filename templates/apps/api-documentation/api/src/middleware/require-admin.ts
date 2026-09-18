import type { NextFunction, Request, Response } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

/**
 * Documentation-operator allow-list. Set `ADMIN_EMAILS` in the API `.env` to a
 * comma-separated list of the email addresses that own this documentation site,
 * e.g. `ADMIN_EMAILS=owner@docs.com,ops@docs.com`. Any signed-in user whose
 * account email is on this list is treated as the documentation administrator
 * and is lazily promoted to `role = 'admin'` on first access so the column
 * becomes the durable source of truth thereafter.
 */
const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

interface DocsUser {
  id?: string
  email?: string
  role?: string
}

/**
 * Authorization gate for operator-managed documentation catalogs. A valid
 * session alone is NOT sufficient for the *write* verbs on the shared,
 * globally-visible catalogs (SDKs, error reference, changelog, specs,
 * endpoints): those tables are presented to every developer reading the docs,
 * so a non-admin write is a content-injection / supply-chain vector (security
 * finding P2H-2 — a forged `install_command` shown to every developer). The
 * caller must therefore be the designated documentation administrator.
 *
 * An admin is any user with `role === 'admin'` on their `users` row, OR whose
 * account email is in the `ADMIN_EMAILS` env allow-list (the designated
 * operator(s)). This blocks the unauthorized write path while leaving the
 * legitimate operator's catalog management — and all public GET reads — fully
 * functional.
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

    const user = await findById<DocsUser>('users', userId)
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
      // Designated documentation operator — durably promote so the role column
      // is the source of truth on subsequent requests. Best-effort: a write
      // failure must not lock the operator out of their own catalog.
      try {
        await updateById('users', userId, { role: 'admin' })
      } catch (error) {
        logger.warn({ error }, 'Failed to persist admin role promotion')
      }
      next()
      return
    }

    res.status(403).json({ error: t('errors.forbidden', {}, { defaultValue: 'Forbidden' }) })
  } catch (error) {
    logger.error(error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
}
