/**
 * Users handler — paginated list endpoint.
 *
 * The same shape works for any resource: swap 'users' for the table name.
 * `findMany` and `count` come from the abstract `@molecule/api-database`
 * core; whichever database provider is wired (postgres, mysql, sqlite)
 * implements them. Handlers never import a concrete driver.
 */
import type { NextFunction, Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// The users table is PII — every row carries an email address (and whatever
// else your app adds: names, plan, oauth identity). The framework's own User
// resource ships NO list route for exactly that reason: its only reads are
// authSelf-gated `/users/:id` routes, and `POST /users` (signup) is public, so
// there is no app-wide gate that would protect this one. Mount it behind the
// session check below, like every other list in this tree (sortable-table's
// orders, csv-import) — an ungated copy of this handler is a public directory
// of every user's email address. ADAPT the gate to the use case: an admin
// panel adds a role/admin check AFTER requireAuth (see the
// auth/role-based-access example), and a public member directory selects
// PUBLIC columns only rather than `findMany('users')`'s full rows.
const requireAuth = (_req: Request, res: Response, next: NextFunction): void => {
  if (!res.locals.session?.userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  next()
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

router.get(
  '/',
  requireAuth,
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
      const where: WhereCondition[] = []

      const users = await findMany('users', {
        where,
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      const total = await count('users', where)
      res.json({ data: users, total, page, limit })
    } catch (error) {
      logger.error('users.list failed', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
