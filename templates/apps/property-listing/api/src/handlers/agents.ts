import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import type { WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const listAgentsQuery = z.object({
  city: z.string().optional(),
  specialty: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})

const listListingsQuery = z.object({
  status: z.string().optional().default('active'),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(20),
})

// ---------------------------------------------------------------------------
// GET / — List agents
// ---------------------------------------------------------------------------

router.get('/', validateQuery(listAgentsQuery), async (req: Request, res: Response) => {
  try {
    const { city, specialty, page, limit } = req.query as unknown as z.infer<typeof listAgentsQuery>

    const where: WhereCondition[] = [{ field: 'active', operator: '=', value: true }]
    if (city) where.push({ field: 'city', operator: '=', value: city })
    if (specialty) where.push({ field: 'specialty', operator: '=', value: specialty })

    const agents = await findMany('agents', {
      where,
      orderBy: [{ field: 'rating', direction: 'desc' }],
      limit,
      offset: (page! - 1) * limit!,
    })

    res.json({ data: agents, page })
  } catch (error) {
    logger.error('agents.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id — Get agent detail
//
// Agents are a public lookup table; no userId / owner_id scoping is
// required. The endpoint deliberately does not gate by session because
// agent profiles are public-readable (and link from the public property
// pages). Mutations to agents are NOT exposed by this router — see the
// admin profile endpoints for any owner-scoped writes.
// ---------------------------------------------------------------------------

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string
    const agent = await findById('agents', id)
    if (!agent) {
      return res
        .status(404)
        .json({ error: t('agent.notFound', {}, { defaultValue: 'Agent not found' }) })
    }
    res.json(agent)
  } catch (error) {
    logger.error('agents.getById', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// ---------------------------------------------------------------------------
// GET /:id/listings — Get agent's listings
// ---------------------------------------------------------------------------

router.get(
  '/:id/listings',
  validateQuery(listListingsQuery),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string
      const { status, page, limit } = req.query as unknown as z.infer<typeof listListingsQuery>

      const where: WhereCondition[] = [
        { field: 'agent_id', operator: '=', value: id },
        { field: 'status', operator: '=', value: status },
      ]

      const listings = await findMany('properties', {
        where,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
        offset: (page! - 1) * limit!,
      })

      res.json({ data: listings, page })
    } catch (error) {
      logger.error('agents.listings', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
