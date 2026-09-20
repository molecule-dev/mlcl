import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { count, create, deleteById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { authorizers } from '@molecule/api-resource-user'

import { requireOwnership } from '../lib/authz.js'
import type { DonorManagementLimits } from '../tiers.js'
import { shapeCampaign } from './_shape.js'

const router = Router()

export const CAMPAIGN_STATUSES = ['draft', 'active', 'completed', 'archived'] as const

const dateOrEmpty = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional()

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(4000).optional(),
  goal_cents: z.number().int().min(0).max(1_000_000_000),
  starts_on: dateOrEmpty,
  ends_on: dateOrEmpty,
  status: z.enum(CAMPAIGN_STATUSES).optional(),
})

const updateCampaignSchema = createCampaignSchema.partial()

router.use(authorizers.auth())

/** Raised-to-date per campaign — derived from the gifts table, never stored. */
async function raisedMap(userId: string): Promise<Map<string, { cents: number; count: number }>> {
  const gifts = await findMany<{ campaign_id?: string; amount_cents?: number }>('gifts', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 10000,
  })
  const map = new Map<string, { cents: number; count: number }>()
  for (const g of gifts) {
    const campaignId = typeof g.campaign_id === 'string' ? g.campaign_id : ''
    if (!campaignId) continue
    const prev = map.get(campaignId) ?? { cents: 0, count: 0 }
    prev.cents += Number(g.amount_cents ?? 0)
    prev.count += 1
    map.set(campaignId, prev)
  }
  return map
}

// List campaigns — owner-scoped, with derived raised-to-date.
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const { status, page = '1', limit = '100' } = req.query
    const where = [
      { field: 'owner_id', operator: '=' as const, value: userId },
      ...(status ? [{ field: 'status', operator: '=' as const, value: String(status) }] : []),
    ]
    const campaigns = await findMany('campaigns', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    const raised = await raisedMap(userId)
    res.json(
      campaigns.map((c) => {
        const r = raised.get(String(c.id))
        return shapeCampaign(c as Record<string, unknown>, r?.cents ?? 0, r?.count ?? 0)
      }),
    )
  } catch (err) {
    logger.error('[campaigns] list failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get campaign details — owner-only.
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('campaigns', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }),
      })
      return
    }
    const raised = await raisedMap(userId)
    const r = raised.get(req.params.id as string)
    res.json(shapeCampaign(check.row as Record<string, unknown>, r?.cents ?? 0, r?.count ?? 0))
  } catch (err) {
    logger.error('[campaigns] detail failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create campaign — entitlement-gated by tier.
router.post(
  '/',
  enforceLimit<DonorManagementLimits>({
    limitType: 'maxCampaigns',
    getLimit: (limits) => limits.maxCampaigns,
    getCurrent: async (userId) =>
      count('campaigns', [{ field: 'owner_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createCampaignSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = res.locals.session.userId as string
      const body = req.body as z.infer<typeof createCampaignSchema>
      const now = new Date().toISOString()
      const result = await create('campaigns', {
        owner_id: userId,
        name: body.name,
        description: body.description ?? '',
        goal_cents: body.goal_cents,
        starts_on: body.starts_on ?? null,
        ends_on: body.ends_on ?? null,
        status: body.status ?? 'active',
        created_at: now,
        updated_at: now,
      })
      res.status(201).json(shapeCampaign(result.data as Record<string, unknown>))
    } catch (err) {
      logger.error('[campaigns] create failed', err)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

// Update campaign — owner-only.
router.put('/:id', validateBody(updateCampaignSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('campaigns', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateCampaignSchema>
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.goal_cents !== undefined) updates.goal_cents = body.goal_cents
    if (body.starts_on !== undefined) updates.starts_on = body.starts_on ?? null
    if (body.ends_on !== undefined) updates.ends_on = body.ends_on ?? null
    if (body.status !== undefined) updates.status = body.status

    const result = await updateById('campaigns', req.params.id as string, updates)
    const raised = await raisedMap(userId)
    const r = raised.get(req.params.id as string)
    res.json(shapeCampaign(result.data as Record<string, unknown>, r?.cents ?? 0, r?.count ?? 0))
  } catch (err) {
    logger.error('[campaigns] update failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete campaign — owner-only. Gifts survive with campaign_id set to NULL
// (FK ON DELETE SET NULL): past giving history must never disappear because
// a campaign folder was cleaned up.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    const check = await requireOwnership('campaigns', req.params.id as string, userId)
    if (!check.ok) {
      res.status(check.status).json({
        error: t('campaigns.notFound', {}, { defaultValue: 'Campaign not found' }),
      })
      return
    }
    await deleteById('campaigns', req.params.id as string)
    res.status(204).end()
  } catch (err) {
    logger.error('[campaigns] delete failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
