import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { CrowdfundingLimits } from '../tiers.js'
import { decorateTier } from './_decorate.js'

const router = Router()

function fail(res: Response, error: unknown): void {
  logger.error('crowdfunding.tiers', error)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

const createTierSchema = z.object({
  campaign_id: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  amount: z.number().positive(),
  max_backers: z.number().int().positive().nullable().optional(),
  estimated_delivery: z.string().nullable().optional(),
})

const updateTierSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  amount: z.number().positive().optional(),
  max_backers: z.number().int().positive().nullable().optional(),
  estimated_delivery: z.string().nullable().optional(),
})

router.get('/campaign/:campaignId', async (req: Request, res: Response) => {
  try {
    const tiers = await findMany<Record<string, unknown>>('reward_tiers', {
      where: [{ field: 'campaign_id', operator: '=', value: req.params.campaignId }],
      orderBy: [{ field: 'amount', direction: 'asc' }],
    })
    res.json(tiers.map(decorateTier))
  } catch (error) {
    fail(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tier = await findById<Record<string, unknown>>('reward_tiers', getParamId(req))
    if (!tier) {
      res
        .status(404)
        .json({ error: t('tiers.notFound', {}, { defaultValue: 'Reward tier not found' }) })
      return
    }
    res.json(decorateTier(tier))
  } catch (error) {
    fail(res, error)
  }
})

router.post(
  '/',
  enforceLimit<CrowdfundingLimits>({
    limitType: 'maxTiers',
    getLimit: (limits) => limits.maxTiers,
    getCurrent: async (userId) => {
      // Count tiers across all campaigns owned by user.
      const campaigns = await findMany<Record<string, unknown>>('campaigns', {
        where: [{ field: 'creator_id', operator: '=', value: userId }],
      })
      let total = 0
      for (const c of campaigns) {
        total += await count('reward_tiers', [
          { field: 'campaign_id', operator: '=', value: String(c.id) },
        ])
      }
      return total
    },
  }) as unknown as RequestHandler,
  validateBody(createTierSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { campaign_id, title, description, amount, max_backers, estimated_delivery } = req.body

      const campaign = await findById<Record<string, unknown>>('campaigns', campaign_id)
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

      const result = await create('reward_tiers', {
        campaign_id,
        title,
        description,
        amount,
        max_backers: max_backers ?? null,
        current_backers: 0,
        estimated_delivery: estimated_delivery ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      res.status(201).json(decorateTier(result.data as Record<string, unknown>))
    } catch (error) {
      fail(res, error)
    }
  },
)

router.put('/:id', validateBody(updateTierSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const tier = await findById<Record<string, unknown>>('reward_tiers', id)
    if (!tier) {
      res
        .status(404)
        .json({ error: t('tiers.notFound', {}, { defaultValue: 'Reward tier not found' }) })
      return
    }
    const campaign = await findById<Record<string, unknown>>('campaigns', String(tier.campaign_id))
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

    if (req.body.max_backers !== undefined && req.body.max_backers !== null) {
      if (Number(req.body.max_backers) < Number(tier.current_backers)) {
        res.status(400).json({
          error: t(
            'tiers.maxBelowCurrent',
            {},
            { defaultValue: 'Max backers cannot be less than current backer count' },
          ),
        })
        return
      }
    }

    const result = await updateById('reward_tiers', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(decorateTier(result.data as Record<string, unknown>))
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
    const tier = await findById<Record<string, unknown>>('reward_tiers', id)
    if (!tier) {
      res
        .status(404)
        .json({ error: t('tiers.notFound', {}, { defaultValue: 'Reward tier not found' }) })
      return
    }
    const campaign = await findById<Record<string, unknown>>('campaigns', String(tier.campaign_id))
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
    if (Number(tier.current_backers) > 0) {
      res.status(400).json({
        error: t('tiers.hasBackers', {}, { defaultValue: 'Cannot delete a tier that has backers' }),
      })
      return
    }

    await deleteById('reward_tiers', id)
    res.status(204).end()
  } catch (error) {
    fail(res, error)
  }
})

export default router
