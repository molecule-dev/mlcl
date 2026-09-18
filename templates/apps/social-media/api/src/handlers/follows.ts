import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, findOne } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { SocialMediaLimits } from '../tiers.js'
import { notificationEnabled } from './_notify.js'

const router = Router()

const followBodySchema = z.object({
  user_id: z.string().uuid(),
})

router.get('/followers/:userId', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const rows = await findMany('user_follows', {
      where: [{ field: 'following_id', operator: '=', value: String(req.params.userId) }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    res.json(rows)
  } catch (error) {
    logger.error('follows.getFollowers', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/following/:userId', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const rows = await findMany('user_follows', {
      where: [{ field: 'follower_id', operator: '=', value: String(req.params.userId) }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    res.json(rows)
  } catch (error) {
    logger.error('follows.getFollowing', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

async function performFollow(userId: string, target: string, res: Response): Promise<Response> {
  if (target === userId) {
    return res
      .status(400)
      .json({ error: t('follow.selfForbidden', {}, { defaultValue: 'Cannot follow yourself' }) })
  }
  const targetUser = await findById('users', target)
  if (!targetUser) {
    return res
      .status(404)
      .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
  }
  const existing = await findOne('user_follows', [
    { field: 'follower_id', operator: '=', value: userId },
    { field: 'following_id', operator: '=', value: target },
  ])
  if (existing) {
    return res.json({ following: true })
  }
  await create('user_follows', {
    follower_id: userId,
    following_id: target,
    created_at: new Date(),
  })
  if (await notificationEnabled(target, 'follow')) {
    await create('notifications', {
      user_id: target,
      type: 'follow',
      actor_id: userId,
      target_type: 'user',
      target_id: userId,
      body: 'started following you',
      href: `/profile/${userId}`,
      unread: true,
      created_at: new Date(),
    })
  }
  return res.status(201).json({ following: true })
}

async function performUnfollow(userId: string, target: string, res: Response): Promise<Response> {
  const existing = await findOne<Record<string, unknown>>('user_follows', [
    { field: 'follower_id', operator: '=', value: userId },
    { field: 'following_id', operator: '=', value: target },
  ])
  if (existing) {
    await deleteById('user_follows', existing.id as string)
  }
  return res.json({ following: false })
}

// Enforce the per-tier follow cap (tiers.ts maxFollows) — defined + shown on Pricing (CATALOG claims
// it gated) but neither follow-create route enforced it, so any tier could follow unlimited accounts.
// Both /users/:userId and / (body user_id) funnel into performFollow, so both gate on this.
const enforceFollowLimit = enforceLimit<SocialMediaLimits>({
  limitType: 'maxFollows',
  getLimit: (limits) => limits.maxFollows,
  getCurrent: async (userId) =>
    count('user_follows', [{ field: 'follower_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/users/:userId', enforceFollowLimit, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    return await performFollow(userId, String(req.params.userId), res)
  } catch (error) {
    logger.error('follows.postUser', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/users/:userId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    return await performUnfollow(userId, String(req.params.userId), res)
  } catch (error) {
    logger.error('follows.deleteUser', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', enforceFollowLimit, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = followBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    return await performFollow(userId, parsed.data.user_id, res)
  } catch (error) {
    logger.error('follows.post', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:followingId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    return await performUnfollow(userId, String(req.params.followingId), res)
  } catch (error) {
    logger.error('follows.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
