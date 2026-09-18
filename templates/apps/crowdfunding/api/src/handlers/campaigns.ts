import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { resize } from '@molecule/api-image'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { index, search } from '@molecule/api-search'

import type { CrowdfundingLimits } from '../tiers.js'
import {
  type CampaignRow,
  countActiveBackers,
  decorateCampaign,
  decorateTier,
} from './_decorate.js'

const router = Router()

function fail(res: Response, error: unknown, status = 500): void {
  // Log the real error server-side; NEVER return the raw internal error text to the
  // client (CWE-209) — these public browse endpoints would otherwise leak DB/stack
  // details to anonymous callers. [P5TPL-1]
  logger.error(error)
  res.status(status).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

// Featuring a campaign is an editorial-curation action reserved for site
// admins — NOT a creator self-service toggle. Without this gate any
// authenticated user (or any campaign owner) could promote a campaign onto
// the homepage. Gated by a flat 'admin' role check on the users table
// (mirrors the blog template's role-gated taxonomy).
async function isAdmin(userId: string): Promise<boolean> {
  const user = await findById<Record<string, unknown>>('users', userId)
  return user?.role === 'admin'
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  category: z.string().optional(),
  creator_id: z.string().optional(),
  sort: z.enum(['trending', 'ending_soon', 'created_at']).default('created_at'),
})

const searchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createCampaignSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  goal_amount: z.number().positive(),
  start_date: z.string().optional(),
  end_date: z.string().min(1),
  category: z.string().default('general'),
})

const updateCampaignSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  goal_amount: z.number().positive().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  category: z.string().optional(),
})

const coverUploadSchema = z.object({
  image: z.string().min(1),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { page, limit, status, category, creator_id, sort } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    const where: Array<{ field: string; operator: '='; value: unknown }> = []
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (category) where.push({ field: 'category', operator: '=', value: category })
    if (creator_id) where.push({ field: 'creator_id', operator: '=', value: creator_id })

    const orderBy =
      sort === 'trending'
        ? [{ field: 'raised_amount', direction: 'desc' as const }]
        : sort === 'ending_soon'
          ? [{ field: 'end_date', direction: 'asc' as const }]
          : [{ field: 'created_at', direction: 'desc' as const }]

    const rows = await findMany<CampaignRow>('campaigns', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy,
    })
    const decorated = await Promise.all(rows.map((r) => decorateCampaign(r)))
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.get('/mine', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const rows = await findMany<CampaignRow>('campaigns', {
      where: [{ field: 'creator_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const decorated = await Promise.all(rows.map((r) => decorateCampaign(r)))
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.get('/search', validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  try {
    const { q, page, limit } = req.query as unknown as z.infer<typeof searchQuerySchema>
    let results: { hits: unknown[]; total?: number; estimatedTotalHits?: number }
    try {
      results = (await search('campaigns', { text: q, page, perPage: limit })) as typeof results
    } catch (searchError) {
      // Fall back to a database LIKE filter if MeiliSearch isn't reachable.
      logger.error(searchError)
      const rows = await findMany<CampaignRow>('campaigns', {
        where: [{ field: 'title', operator: 'ilike', value: q }],
        limit,
        offset: (page - 1) * limit,
      })
      const decorated = await Promise.all(rows.map((r) => decorateCampaign(r)))
      res.json({ hits: decorated, total: decorated.length })
      return
    }
    const hits = await Promise.all(
      (results.hits ?? []).map(async (h) => {
        if (h && typeof h === 'object' && 'id' in h) {
          const fresh = await findById<CampaignRow>('campaigns', String((h as { id: unknown }).id))
          if (fresh) return decorateCampaign(fresh)
        }
        return h
      }),
    )
    res.json({ ...results, hits })
  } catch (error) {
    fail(res, error)
  }
})

router.get('/featured', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 6)))
    const rows = await findMany<CampaignRow>('campaigns', {
      where: [
        { field: 'featured', operator: '=', value: true },
        { field: 'status', operator: '=', value: 'active' },
      ],
      limit,
      orderBy: [{ field: 'raised_amount', direction: 'desc' }],
    })
    const decorated = await Promise.all(rows.map((r) => decorateCampaign(r)))
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const allCampaigns = await findMany<CampaignRow>('campaigns')
    const activeCampaigns = allCampaigns.filter((c) => c.status === 'active')
    const fundedCampaigns = allCampaigns.filter((c) => c.status === 'funded')
    const totalRaised = allCampaigns.reduce(
      (sum: number, c) => sum + Number(c.raised_amount ?? 0),
      0,
    )

    const allPledges = await findMany<Record<string, unknown>>('pledges')
    const totalBackers = new Set(allPledges.map((p) => String(p.backer_id))).size

    res.json({
      total_campaigns: allCampaigns.length,
      active_campaigns: activeCampaigns.length,
      funded_campaigns: fundedCampaigns.length,
      total_raised: totalRaised,
      total_backers: totalBackers,
    })
  } catch (error) {
    fail(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const row = await findById<CampaignRow>('campaigns', id)
    if (!row) {
      res
        .status(404)
        .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
      return
    }
    const tierRows = await findMany<Record<string, unknown>>('reward_tiers', {
      where: [{ field: 'campaign_id', operator: '=', value: id }],
      orderBy: [{ field: 'amount', direction: 'asc' }],
    })
    const decoratedTiers = tierRows.map(decorateTier)
    const backerCount = await countActiveBackers(id)
    const decorated = await decorateCampaign(row, { backerCount })
    res.json({ ...decorated, tiers: decoratedTiers })
  } catch (error) {
    fail(res, error)
  }
})

router.post(
  '/',
  enforceLimit<CrowdfundingLimits>({
    limitType: 'maxCampaigns',
    getLimit: (limits) => limits.maxCampaigns,
    getCurrent: async (userId) =>
      count('campaigns', [{ field: 'creator_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createCampaignSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { title, description, goal_amount, start_date, end_date, category } =
        req.body as z.infer<typeof createCampaignSchema>

      const result = await create('campaigns', {
        creator_id: userId,
        title,
        description,
        goal_amount,
        raised_amount: 0,
        start_date: start_date ?? new Date().toISOString(),
        end_date,
        status: 'draft',
        category,
        cover_image_url: null,
        featured: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const created = result.data as Record<string, unknown>
      try {
        await index('campaigns', String(created.id), created)
      } catch (indexError) {
        logger.error(indexError)
      }
      const decorated = await decorateCampaign(created as unknown as CampaignRow, {
        backerCount: 0,
      })
      res.status(201).json(decorated)
    } catch (error) {
      fail(res, error)
    }
  },
)

router.put('/:id', validateBody(updateCampaignSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('campaigns', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
      return
    }
    if (existing.creator_id !== userId) {
      res.status(403).json({
        error: t(
          'campaigns.notOwner',
          {},
          { defaultValue: 'Only the campaign creator can edit this campaign' },
        ),
      })
      return
    }
    if (existing.status !== 'draft' && existing.status !== 'active') {
      res.status(400).json({
        error: t(
          'campaigns.cannotEdit',
          {},
          { defaultValue: 'Campaign cannot be edited in current status' },
        ),
      })
      return
    }

    const result = await updateById('campaigns', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    const updated = result.data as Record<string, unknown>
    try {
      await index('campaigns', String(updated.id), updated)
    } catch (indexError) {
      logger.error(indexError)
    }
    const decorated = await decorateCampaign(updated as unknown as CampaignRow)
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.post('/:id/cover', validateBody(coverUploadSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const campaign = await findById<Record<string, unknown>>('campaigns', id)
    if (!campaign) {
      res
        .status(404)
        .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
      return
    }
    if (campaign.creator_id !== userId) {
      res.status(403).json({
        error: t(
          'campaigns.notOwner',
          {},
          { defaultValue: 'Only the campaign creator can edit this campaign' },
        ),
      })
      return
    }

    const decoded = Buffer.from(String(req.body.image).replace(/^data:[^;]+;base64,/, ''), 'base64')
    const resized = await resize(decoded, { width: 1200, height: 630, fit: 'cover' })
    const coverUrl = `data:image/jpeg;base64,${Buffer.from(resized).toString('base64')}`

    const result = await updateById('campaigns', id, {
      cover_image_url: coverUrl,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    fail(res, error)
  }
})

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const campaign = await findById<Record<string, unknown>>('campaigns', id)
    if (!campaign) {
      res
        .status(404)
        .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
      return
    }
    if (campaign.creator_id !== userId) {
      res.status(403).json({
        error: t(
          'campaigns.notOwner',
          {},
          { defaultValue: 'Only the campaign creator can edit this campaign' },
        ),
      })
      return
    }
    if (campaign.status !== 'draft') {
      res.status(400).json({
        error: t(
          'campaigns.alreadyPublished',
          {},
          { defaultValue: 'Campaign is already published' },
        ),
      })
      return
    }

    const tiers = await findMany('reward_tiers', {
      where: [{ field: 'campaign_id', operator: '=', value: id }],
      limit: 1,
    })
    if (tiers.length === 0) {
      res.status(400).json({
        error: t(
          'campaigns.noTiers',
          {},
          { defaultValue: 'Campaign must have at least one reward tier before publishing' },
        ),
      })
      return
    }

    const result = await updateById('campaigns', id, {
      status: 'active',
      start_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    const published = result.data as Record<string, unknown>
    try {
      await index('campaigns', String(published.id), published)
    } catch (indexError) {
      logger.error(indexError)
    }
    const decorated = await decorateCampaign(published as unknown as CampaignRow)
    res.json(decorated)
  } catch (error) {
    fail(res, error)
  }
})

router.post('/:id/feature', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    if (!(await isAdmin(userId))) {
      res.status(403).json({
        error: t(
          'campaigns.notAdmin',
          {},
          { defaultValue: 'Only an administrator can feature campaigns' },
        ),
      })
      return
    }
    const id = getParamId(req)
    const campaign = await findById<Record<string, unknown>>('campaigns', id)
    if (!campaign) {
      res
        .status(404)
        .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
      return
    }

    const result = await updateById('campaigns', id, {
      featured: !campaign.featured,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    fail(res, error)
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const campaign = await findById<Record<string, unknown>>('campaigns', id)
    if (!campaign) {
      res
        .status(404)
        .json({ error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }) })
      return
    }
    if (campaign.creator_id !== userId) {
      res.status(403).json({
        error: t(
          'campaigns.notOwner',
          {},
          { defaultValue: 'Only the campaign creator can edit this campaign' },
        ),
      })
      return
    }
    if (campaign.status !== 'draft') {
      res.status(400).json({
        error: t(
          'campaigns.cannotDelete',
          {},
          { defaultValue: 'Only draft campaigns can be deleted' },
        ),
      })
      return
    }

    await deleteById('campaigns', id)
    res.status(204).end()
  } catch (error) {
    fail(res, error)
  }
})

export default router
