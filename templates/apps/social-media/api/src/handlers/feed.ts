import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { enrichPosts } from '../lib/enrich-posts.js'

const router = Router()

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = paginationSchema.safeParse(req.query)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: t('errors.validation', {}, { defaultValue: 'Validation failed' }) })
    }
    const { limit, offset } = parsed.data

    const follows = await findMany<{ following_id: string }>('user_follows', {
      where: [{ field: 'follower_id', operator: '=', value: userId }],
      limit: 1000,
    })
    const followedIds = follows.map((f) => f.following_id)

    let rawPosts: Array<Record<string, unknown>>
    if (followedIds.length === 0) {
      rawPosts = await findMany('posts', {
        where: [{ field: 'visibility', operator: '=', value: 'public' }],
        orderBy: [
          { field: 'like_count', direction: 'desc' },
          { field: 'created_at', direction: 'desc' },
        ],
        limit,
        offset,
      })
    } else {
      const ids = [...followedIds, userId]
      rawPosts = await findMany('posts', {
        where: [
          { field: 'user_id', operator: 'in', value: ids },
          { field: 'visibility', operator: 'in', value: ['public', 'followers'] },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit,
        offset,
      })
    }

    const enriched = await enrichPosts(rawPosts as never[], userId)
    res.json(enriched)
  } catch (err) {
    console.error('social-media 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/explore', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const parsed = paginationSchema.safeParse(req.query)
    if (!parsed.success) {
      return res
        .status(400)
        .json({ error: t('errors.validation', {}, { defaultValue: 'Validation failed' }) })
    }
    const { limit, offset } = parsed.data
    const rawPosts = await findMany('posts', {
      where: [{ field: 'visibility', operator: '=', value: 'public' }],
      orderBy: [
        { field: 'like_count', direction: 'desc' },
        { field: 'created_at', direction: 'desc' },
      ],
      limit,
      offset,
    })
    const enriched = await enrichPosts(rawPosts as never[], userId)
    res.json(enriched)
  } catch (err) {
    console.error('social-media 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/suggestions', async (_req: Request, res: Response) => {
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
    const excluded = new Set([userId, ...follows.map((f) => f.following_id)])

    const allUsers = await findMany<{
      id: string
      username: string | null
      name: string | null
      email: string | null
    }>('users', {
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
      limit: 50,
    })
    const candidates = allUsers.filter((u) => !excluded.has(u.id)).slice(0, 5)
    res.json(
      candidates.map((u) => ({
        id: u.id,
        display_name:
          u.name || u.username || (u.email ? u.email.split('@')[0] : `user_${u.id.slice(0, 6)}`),
        handle:
          u.username ||
          (u.email
            ? u.email
                .split('@')[0]
                .replace(/[^a-z0-9]/gi, '')
                .toLowerCase()
            : `user_${u.id.slice(0, 6)}`),
        cover_index: 0,
        is_verified: false,
        bio: '',
        reason: 'New on Vivid',
        mutual_count: 0,
      })),
    )
  } catch (err) {
    console.error('social-media 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/hashtags', async (_req: Request, res: Response) => {
  try {
    const recent = await findMany<{ hashtags: string[] }>('posts', {
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })
    const counts = new Map<string, number>()
    for (const post of recent) {
      const tags = Array.isArray(post.hashtags) ? post.hashtags : []
      for (const tag of tags) {
        if (!tag) continue
        counts.set(tag, (counts.get(tag) ?? 0) + 1)
      }
    }
    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, post_count: count, delta_pct: 0 }))
    res.json(ranked)
  } catch (err) {
    console.error('social-media 500:', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
