import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { type CampaignRow, decorateCampaign, decoratePledge } from './_decorate.js'

const router = Router()

function fail(res: Response, error: unknown): void {
  logger.error('crowdfunding.profiles', error)
  res.status(500).json({
    error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
  })
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }

    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }

    const ownCampaigns = await findMany<CampaignRow>('campaigns', {
      where: [{ field: 'creator_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const myPledges = await findMany<Record<string, unknown>>('pledges', {
      where: [{ field: 'backer_id', operator: '=', value: userId }],
    })

    const totalRaised = ownCampaigns.reduce((sum, c) => sum + Number(c.raised_amount ?? 0), 0)
    const totalBackers = new Set<string>()
    for (const c of ownCampaigns) {
      const ps = await findMany<Record<string, unknown>>('pledges', {
        where: [{ field: 'campaign_id', operator: '=', value: c.id }],
      })
      for (const p of ps) totalBackers.add(String(p.backer_id))
    }

    const totalPledged = myPledges.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)

    const profileMeta = (user.oauthData ?? {}) as Record<string, unknown>

    res.json({
      id: String(user.id),
      name: user.name ? String(user.name) : null,
      email: user.email ? String(user.email) : null,
      username: user.username ? String(user.username) : null,
      bio: profileMeta.bio ? String(profileMeta.bio) : null,
      avatar_url: profileMeta.avatar_url ? String(profileMeta.avatar_url) : null,
      preferences: (profileMeta.preferences ?? {}) as Record<string, unknown>,
      created_at: user.createdAt ? new Date(user.createdAt as string | Date).toISOString() : null,
      campaigns_created: ownCampaigns.length,
      campaigns_funded: ownCampaigns.filter((c) => c.status === 'funded').length,
      total_raised: totalRaised,
      backer_count: totalBackers.size,
      pledges_count: myPledges.length,
      total_pledged: totalPledged,
    })
  } catch (error) {
    fail(res, error)
  }
})

router.patch('/me', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }

    const body = req.body as Record<string, unknown>
    const updates: Record<string, unknown> = {}
    if (typeof body.name === 'string') updates.name = body.name
    if (typeof body.username === 'string') updates.username = body.username

    const oauthData = (user.oauthData ?? {}) as Record<string, unknown>
    if (typeof body.bio === 'string') oauthData.bio = body.bio
    if (typeof body.avatar_url === 'string') oauthData.avatar_url = body.avatar_url
    if (body.preferences && typeof body.preferences === 'object') {
      oauthData.preferences = {
        ...((oauthData.preferences ?? {}) as Record<string, unknown>),
        ...(body.preferences as Record<string, unknown>),
      }
    }
    updates.oauthData = oauthData
    updates.updatedAt = new Date().toISOString()

    const { updateById } = await import('@molecule/api-database')
    const result = await updateById('users', userId, updates)
    const updated = result.data as Record<string, unknown>
    const meta = (updated.oauthData ?? {}) as Record<string, unknown>
    res.json({
      id: String(updated.id),
      name: updated.name ? String(updated.name) : null,
      email: updated.email ? String(updated.email) : null,
      username: updated.username ? String(updated.username) : null,
      bio: meta.bio ? String(meta.bio) : null,
      avatar_url: meta.avatar_url ? String(meta.avatar_url) : null,
      preferences: (meta.preferences ?? {}) as Record<string, unknown>,
    })
  } catch (error) {
    fail(res, error)
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id
    const user = await findById<Record<string, unknown>>('users', String(id))
    if (!user) {
      res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
      return
    }
    const ownCampaigns = await findMany<CampaignRow>('campaigns', {
      where: [{ field: 'creator_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const decoratedCampaigns = await Promise.all(ownCampaigns.map((c) => decorateCampaign(c)))

    const myPledges = await findMany<Record<string, unknown>>('pledges', {
      where: [{ field: 'backer_id', operator: '=', value: id }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 25,
    })
    const cache = new Map<string, CampaignRow | null>()
    const decoratedPledges = await Promise.all(myPledges.map((p) => decoratePledge(p, cache)))

    const meta = (user.oauthData ?? {}) as Record<string, unknown>
    res.json({
      id: String(user.id),
      name: user.name ? String(user.name) : null,
      username: user.username ? String(user.username) : null,
      bio: meta.bio ? String(meta.bio) : null,
      avatar_url: meta.avatar_url ? String(meta.avatar_url) : null,
      created_at: user.createdAt ? new Date(user.createdAt as string | Date).toISOString() : null,
      campaigns: decoratedCampaigns,
      backed_campaigns: decoratedPledges,
      stats: {
        campaigns_created: ownCampaigns.length,
        campaigns_funded: ownCampaigns.filter((c) => c.status === 'funded').length,
        total_raised: ownCampaigns.reduce((sum, c) => sum + Number(c.raised_amount ?? 0), 0),
        backed_count: myPledges.length,
      },
    })
  } catch (error) {
    fail(res, error)
  }
})

export default router
