import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { SocialMediaLimits } from '../tiers.js'

const router = Router()

const createStorySchema = z.object({
  media_url: z.string().min(1),
  caption: z.string().max(500).nullable().optional(),
  visibility: z.enum(['public', 'followers']).default('followers'),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const follows = await findMany<{ following_id: string }>('user_follows', {
      where: [{ field: 'follower_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const followedIds = follows.map((f) => f.following_id)
    const candidateIds = [userId, ...followedIds]

    const stories = await findMany<Record<string, unknown>>('stories', {
      where: [
        { field: 'user_id', operator: 'in', value: candidateIds },
        { field: 'expires_at', operator: '>', value: new Date() },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })

    const grouped = new Map<string, unknown[]>()
    for (const story of stories) {
      const ownerId = story.user_id as string
      if (!grouped.has(ownerId)) grouped.set(ownerId, [])
      grouped.get(ownerId)!.push(story)
    }
    res.json(
      Array.from(grouped.entries()).map(([ownerId, items]) => ({
        user_id: ownerId,
        stories: items,
      })),
    )
  } catch (error) {
    logger.error('stories.getStories', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Enforce the per-tier story cap (tiers.ts maxStories) — defined + shown on Pricing (CATALOG claims
// it gated) but the create route never enforced it, so any tier could post unlimited stories.
const enforceStoryLimit = enforceLimit<SocialMediaLimits>({
  limitType: 'maxStories',
  getLimit: (limits) => limits.maxStories,
  getCurrent: async (userId) =>
    count('stories', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforceStoryLimit, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = createStorySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const result = await create('stories', {
      user_id: userId,
      media_url: parsed.data.media_url,
      caption: parsed.data.caption ?? null,
      visibility: parsed.data.visibility,
      view_count: 0,
      created_at: new Date(),
      expires_at: expiresAt,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('stories.postStory', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const story = await findById<Record<string, unknown>>('stories', id)
    if (!story) {
      return res
        .status(404)
        .json({ error: t('story.notFound', {}, { defaultValue: 'Story not found' }) })
    }
    const existing = await findOne('story_views', [
      { field: 'story_id', operator: '=', value: id },
      { field: 'viewer_id', operator: '=', value: userId },
    ])
    if (!existing) {
      await create('story_views', {
        story_id: id,
        viewer_id: userId,
        viewed_at: new Date(),
      })
      const next = ((story.view_count as number) ?? 0) + 1
      await updateById('stories', id, { view_count: next })
    }
    res.json({ viewed: true })
  } catch (error) {
    logger.error('stories.postView', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/views', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const story = await findById<Record<string, unknown>>('stories', id)
    if (!story) {
      return res
        .status(404)
        .json({ error: t('story.notFound', {}, { defaultValue: 'Story not found' }) })
    }
    if (story.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('story.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const views = await findMany('story_views', {
      where: [{ field: 'story_id', operator: '=', value: id }],
      orderBy: [{ field: 'viewed_at', direction: 'desc' }],
    })
    res.json(views)
  } catch (error) {
    logger.error('stories.getViews', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const story = await findById<Record<string, unknown>>('stories', id)
    if (!story) {
      return res
        .status(404)
        .json({ error: t('story.notFound', {}, { defaultValue: 'Story not found' }) })
    }
    if (story.user_id !== userId) {
      return res
        .status(403)
        .json({ error: t('story.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('stories', id)
    res.status(204).end()
  } catch (error) {
    logger.error('stories.deleteStory', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
