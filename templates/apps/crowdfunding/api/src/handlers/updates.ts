import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { CrowdfundingLimits } from '../tiers.js'

const router = Router()

function fail(res: Response, error: unknown): void {
  logger.error(error)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createUpdateSchema = z.object({
  campaign_id: z.string().min(1),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  backers_only: z.boolean().optional().default(false),
})

const updateUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).optional(),
  backers_only: z.boolean().optional(),
})

// A `backers_only` update is restricted content: visible only to the campaign
// creator or to a backer with an active pledge on that campaign. Anonymous and
// non-backer callers must never receive it (public updates stay visible to
// everyone). Access is resolved ONCE per campaign so listing a campaign's
// updates costs at most one extra pledge lookup regardless of row count.
async function canViewBackersOnly(campaignId: string, userId: string | null): Promise<boolean> {
  if (!userId) return false
  const campaign = await findById<Record<string, unknown>>('campaigns', campaignId)
  if (campaign?.creator_id === userId) return true
  const activePledges = await findMany<Record<string, unknown>>('pledges', {
    where: [
      { field: 'campaign_id', operator: '=', value: campaignId },
      { field: 'backer_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ],
    limit: 1,
  })
  return activePledges.length > 0
}

router.get(
  '/campaign/:campaignId',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
      const rawCampaignId = req.params.campaignId
      const campaignId = Array.isArray(rawCampaignId) ? rawCampaignId[0] : rawCampaignId
      const updates = await findMany<Record<string, unknown>>('campaign_updates', {
        where: [{ field: 'campaign_id', operator: '=', value: campaignId }],
        limit,
        offset: (page - 1) * limit,
        orderBy: [{ field: 'created_at', direction: 'desc' }],
      })
      // Hide backers-only updates from anyone who isn't the creator or an
      // active backer. Access is the same for every row in this single-campaign
      // list, so it's resolved once.
      const userId = getUserId(res)
      const canSeeBackersOnly = await canViewBackersOnly(campaignId, userId)
      const visible = canSeeBackersOnly ? updates : updates.filter((u) => u.backers_only !== true)
      res.json(visible)
    } catch (error) {
      fail(res, error)
    }
  },
)

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const update = await findById<Record<string, unknown>>('campaign_updates', getParamId(req))
    if (!update) {
      res
        .status(404)
        .json({ error: t('updates.notFound', {}, { defaultValue: 'Update not found' }) })
      return
    }
    // A backers-only update is hidden (404, not 403, so its existence isn't
    // leaked) from anyone who isn't the campaign creator or an active backer.
    if (update.backers_only === true) {
      const userId = getUserId(res)
      const allowed = await canViewBackersOnly(String(update.campaign_id), userId)
      if (!allowed) {
        res
          .status(404)
          .json({ error: t('updates.notFound', {}, { defaultValue: 'Update not found' }) })
        return
      }
    }
    res.json(update)
  } catch (error) {
    fail(res, error)
  }
})

router.post(
  '/',
  enforceLimit<CrowdfundingLimits>({
    limitType: 'maxUpdates',
    getLimit: (limits) => limits.maxUpdates,
    getCurrent: async (userId) =>
      count('campaign_updates', [{ field: 'author_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const { campaign_id, title, body, backers_only } = req.body

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
            { defaultValue: 'Only the campaign creator can post updates' },
          ),
        })
        return
      }

      const result = await create('campaign_updates', {
        campaign_id,
        title,
        body,
        backers_only: backers_only ?? false,
        author_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

      const pledges = await findMany<Record<string, unknown>>('pledges', {
        where: [
          { field: 'campaign_id', operator: '=', value: campaign_id },
          { field: 'status', operator: '=', value: 'active' },
        ],
      })

      const backerIds = Array.from(new Set(pledges.map((p) => String(p.backer_id))))

      for (const backerId of backerIds) {
        const backer = await findById<Record<string, unknown>>('users', backerId)
        if (backer?.email) {
          try {
            await sendMail({
              from:
                process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
              to: String(backer.email),
              subject: t(
                'updates.notificationSubject',
                { campaign: String(campaign.title), title },
                { defaultValue: '{{campaign}}: {{title}}' },
              ),
              text: body,
            })
          } catch (mailError) {
            logger.error(mailError)
          }
        }
      }

      res.status(201).json(result.data)
    } catch (error) {
      fail(res, error)
    }
  },
)

router.put('/:id', validateBody(updateUpdateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const update = await findById<Record<string, unknown>>('campaign_updates', id)
    if (!update) {
      res
        .status(404)
        .json({ error: t('updates.notFound', {}, { defaultValue: 'Update not found' }) })
      return
    }
    if (update.author_id !== userId) {
      res.status(403).json({
        error: t('updates.notAuthor', {}, { defaultValue: 'Only the author can edit this update' }),
      })
      return
    }

    const result = await updateById('campaign_updates', id, {
      ...req.body,
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
    const update = await findById<Record<string, unknown>>('campaign_updates', id)
    if (!update) {
      res
        .status(404)
        .json({ error: t('updates.notFound', {}, { defaultValue: 'Update not found' }) })
      return
    }
    if (update.author_id !== userId) {
      res.status(403).json({
        error: t(
          'updates.notAuthor',
          {},
          { defaultValue: 'Only the author can delete this update' },
        ),
      })
      return
    }

    await deleteById('campaign_updates', id)
    res.status(204).end()
  } catch (error) {
    fail(res, error)
  }
})

export default router
