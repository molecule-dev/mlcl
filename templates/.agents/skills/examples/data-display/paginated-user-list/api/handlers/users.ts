/**
 * Users handler — paginated list endpoint.
 *
 * The same shape works for any resource: swap 'users' for the table name.
 * `findMany` and `count` come from the abstract `@molecule/api-database`
 * core; whichever database provider is wired (postgres, mysql, sqlite)
 * implements them. Handlers never import a concrete driver.
 */
import { Router } from 'express'
import type { Request, Response } from 'express'
import { findMany, count } from '@molecule/api-database'
import type { WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { z } from 'zod'

const router = Router()

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
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
})

export default router
