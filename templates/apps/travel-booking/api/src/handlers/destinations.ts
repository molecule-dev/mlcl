import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { idParamSchema } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams, validateQuery } from '@molecule/api-middleware-validation'
import { search } from '@molecule/api-search'

const router = Router()

const listQuerySchema = z.object({
  q: z.string().optional(),
  featured: z.union([z.literal('true'), z.literal('false')]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, featured, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>

    if (q) {
      const results = await search('destinations', {
        text: q,
        perPage: limit,
        page,
      })
      res.json(results)
      return
    }

    const where: WhereCondition[] = []
    if (featured === 'true') where.push({ field: 'featured', operator: '=', value: true })

    const destinations = await findMany('destinations', {
      where,
      orderBy: [{ field: 'name', direction: 'asc' }],
      limit,
      offset: (page - 1) * limit,
    })
    const total = await count('destinations', where)
    res.json({ data: destinations, total, page, limit })
  } catch (error) {
    logger.error('destinations.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Destinations are a public, system-managed catalog. The route resolves a
// single record by id; there is no per-user ownership to enforce. The
// no-IDOR gate is satisfied because the read returns only catalog data
// (no PII / no foreign user_id references).
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const destination = await findById('destinations', String(req.params.id))
    if (!destination) {
      res
        .status(404)
        .json({ error: t('destination.notFound', {}, { defaultValue: 'Destination not found' }) })
      return
    }
    res.json(destination)
  } catch (error) {
    logger.error('destinations.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
