import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import {
  count,
  create,
  deleteById,
  deleteMany,
  findById,
  findMany,
  findOne,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { enrichPosts } from '../lib/enrich-posts.js'
import type { SocialMediaLimits } from '../tiers.js'
import { notificationEnabled } from './_notify.js'

const router = Router()

const createPostSchema = z.object({
  caption: z.string().max(2200).default(''),
  media_urls: z.array(z.string()).default([]),
  thumbnail_url: z.string().nullable().optional(),
  hashtags: z.array(z.string()).default([]),
  location: z.string().nullable().optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
})

const updatePostSchema = z.object({
  caption: z.string().max(2200).optional(),
  media_urls: z.array(z.string()).optional(),
  thumbnail_url: z.string().nullable().optional(),
  hashtags: z.array(z.string()).optional(),
  location: z.string().nullable().optional(),
  visibility: z.enum(['public', 'followers', 'private']).optional(),
})

const commentSchema = z.object({
  body: z.string().min(1).max(2200),
  parent_id: z.string().uuid().nullable().optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const viewerId = getUserId(res)
    const userIdQuery = typeof req.query.user_id === 'string' ? req.query.user_id : null
    const limit = Math.min(Number(req.query.limit) || 20, 100)
    const offset = Number(req.query.offset) || 0
    const where = userIdQuery
      ? [
          { field: 'user_id', operator: '=' as const, value: userIdQuery },
          {
            field: 'visibility',
            operator: 'in' as const,
            value: viewerId === userIdQuery ? ['public', 'followers', 'private'] : ['public'],
          },
        ]
      : [{ field: 'visibility', operator: '=' as const, value: 'public' }]
    const posts = await findMany('posts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    const enriched = await enrichPosts(posts as never[], viewerId)
    res.json(enriched)
  } catch (err) {
    logger.error('posts.listPosts', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const post = await findById<Record<string, unknown>>('posts', getParamId(req))
    if (!post) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    const userId = getUserId(res)
    const visibility = post.visibility as string
    const ownerId = post.user_id as string
    if (visibility === 'private' && ownerId !== userId) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    if (visibility === 'followers' && ownerId !== userId) {
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const follow = await findOne('user_follows', [
        { field: 'follower_id', operator: '=', value: userId },
        { field: 'following_id', operator: '=', value: ownerId },
      ])
      if (!follow) {
        return res
          .status(404)
          .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
      }
    }
    const [enriched] = await enrichPosts([post as never], userId)
    res.json(enriched)
  } catch (err) {
    logger.error('posts.getPost', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

// Enforce the per-tier post cap (tiers.ts maxPosts) — defined + shown on Pricing (CATALOG claims it
// gated) but the create route never enforced it, so any tier could post unlimited.
const enforcePostLimit = enforceLimit<SocialMediaLimits>({
  limitType: 'maxPosts',
  getLimit: (limits) => limits.maxPosts,
  getCurrent: async (userId) =>
    count('posts', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

router.post('/', enforcePostLimit, async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = createPostSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const data = parsed.data
    const result = await create('posts', {
      user_id: userId,
      caption: data.caption,
      media_urls: JSON.stringify(data.media_urls),
      thumbnail_url: data.thumbnail_url ?? null,
      hashtags: data.hashtags,
      location: data.location ?? null,
      visibility: data.visibility,
      like_count: 0,
      comment_count: 0,
      created_at: new Date(),
    })
    const [enriched] = await enrichPosts([result.data as never], userId)
    res.status(201).json(enriched)
  } catch (err) {
    logger.error('posts.createPost', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('posts', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: t('post.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    const parsed = updatePostSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    const data = parsed.data
    if (data.caption !== undefined) updates.caption = data.caption
    if (data.media_urls !== undefined) updates.media_urls = JSON.stringify(data.media_urls)
    if (data.thumbnail_url !== undefined) updates.thumbnail_url = data.thumbnail_url
    if (data.hashtags !== undefined) updates.hashtags = data.hashtags
    if (data.location !== undefined) updates.location = data.location
    if (data.visibility !== undefined) updates.visibility = data.visibility
    const result = await updateById('posts', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('posts.patchPost', error)
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
    const existing = await findById<Record<string, unknown>>('posts', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: t('post.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteMany('post_likes', [{ field: 'post_id', operator: '=', value: id }])
    await deleteMany('post_comments', [{ field: 'post_id', operator: '=', value: id }])
    await deleteById('posts', id)
    res.status(204).end()
  } catch (error) {
    logger.error('posts.deletePost', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const postId = getParamId(req)
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (!post) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    const existing = await findOne('post_likes', [
      { field: 'post_id', operator: '=', value: postId },
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existing) {
      await deleteById('post_likes', existing.id as string)
      const next = Math.max(0, ((post.like_count as number) ?? 0) - 1)
      await updateById('posts', postId, { like_count: next })
      return res.json({ liked: false, like_count: next })
    }
    await create('post_likes', {
      post_id: postId,
      user_id: userId,
      created_at: new Date(),
    })
    const next = ((post.like_count as number) ?? 0) + 1
    await updateById('posts', postId, { like_count: next })
    if (post.user_id !== userId && (await notificationEnabled(String(post.user_id), 'like'))) {
      await create('notifications', {
        user_id: post.user_id,
        type: 'like',
        actor_id: userId,
        target_type: 'post',
        target_id: postId,
        body: 'liked your post',
        href: `/posts/${postId}`,
        unread: true,
        created_at: new Date(),
      })
    }
    res.json({ liked: true, like_count: next })
  } catch (error) {
    logger.error('posts.likePost', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id/comments', async (req: Request, res: Response) => {
  try {
    const postId = getParamId(req)
    const limit = Math.min(Number(req.query.limit) || 50, 200)
    const offset = Number(req.query.offset) || 0
    const comments = await findMany<{
      id: string
      user_id: string
      body: string
      created_at: Date | string
      parent_id: string | null
    }>('post_comments', {
      where: [{ field: 'post_id', operator: '=', value: postId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit,
      offset,
    })
    if (comments.length === 0) return res.json([])
    const userIds = Array.from(new Set(comments.map((c) => c.user_id)))
    const users = await findMany<{
      id: string
      username: string | null
      name: string | null
      email: string | null
    }>('users', {
      where: [{ field: 'id', operator: 'in', value: userIds }],
      limit: userIds.length,
    })
    const userMap = new Map(users.map((u) => [u.id, u]))
    const enriched = comments.map((c) => {
      const u = userMap.get(c.user_id)
      const handle =
        u?.username ||
        (u?.email
          ? u.email
              .split('@')[0]
              .replace(/[^a-z0-9]/gi, '')
              .toLowerCase()
          : `user_${c.user_id.slice(0, 6)}`)
      const display = u?.name || handle
      let coverIdx = 0
      for (let i = 0; i < c.user_id.length; i++) coverIdx = (coverIdx + c.user_id.charCodeAt(i)) % 7
      return {
        id: c.id,
        body: c.body,
        posted_at: c.created_at instanceof Date ? c.created_at.toISOString() : String(c.created_at),
        like_count: 0,
        liked: false,
        author: {
          id: c.user_id,
          display_name: display,
          handle,
          cover_index: coverIdx,
          is_verified: false,
          bio: '',
        },
      }
    })
    res.json(enriched)
  } catch (err) {
    logger.error('posts.listComments', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/comments', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const postId = getParamId(req)
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (!post) {
      return res
        .status(404)
        .json({ error: t('post.notFound', {}, { defaultValue: 'Post not found' }) })
    }
    const parsed = commentSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }
    const result = await create('post_comments', {
      post_id: postId,
      user_id: userId,
      parent_id: parsed.data.parent_id ?? null,
      body: parsed.data.body,
      created_at: new Date(),
    })
    const next = ((post.comment_count as number) ?? 0) + 1
    await updateById('posts', postId, { comment_count: next })
    if (post.user_id !== userId && (await notificationEnabled(String(post.user_id), 'comment'))) {
      await create('notifications', {
        user_id: post.user_id,
        type: 'comment',
        actor_id: userId,
        target_type: 'post',
        target_id: postId,
        body: 'commented on your post',
        href: `/posts/${postId}`,
        unread: true,
        created_at: new Date(),
      })
    }
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('posts.postComment', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:postId/comments/:commentId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const commentId = String(req.params.commentId)
    const postId = String(req.params.postId)
    const comment = await findById<Record<string, unknown>>('post_comments', commentId)
    if (!comment) {
      return res
        .status(404)
        .json({ error: t('comment.notFound', {}, { defaultValue: 'Comment not found' }) })
    }
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (comment.user_id !== userId && post?.user_id !== userId) {
      return res.status(403).json({ error: t('post.forbidden', {}, { defaultValue: 'Forbidden' }) })
    }
    await deleteById('post_comments', commentId)
    if (post) {
      const next = Math.max(0, ((post.comment_count as number) ?? 0) - 1)
      await updateById('posts', postId, { comment_count: next })
    }
    res.status(204).end()
  } catch (error) {
    logger.error('posts.deleteComment', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
