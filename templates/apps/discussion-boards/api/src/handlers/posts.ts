import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

/** Reputation awarded to a post's author the first time it's accepted as a topic's solution. */
const SOLUTION_REPUTATION_AWARD = 15

// --- Schemas ---

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

const createPostSchema = z.object({
  body_markdown: z.string().min(1).max(50000),
  parent_post_id: z.string().nullable().optional(),
})

const updatePostSchema = z.object({
  body_markdown: z.string().min(1).max(50000),
})

// --- Helpers ---

async function isModerator(res: Response): Promise<boolean> {
  const session = res.locals.session as { userId?: string } | undefined
  if (!session?.userId) return false
  const user = (await findById('users', session.userId)) as { role?: string } | null
  const role = user?.role ?? 'member'
  return role === 'moderator' || role === 'admin'
}

// --- Routes (mounted under /posts) ---

// List posts in a topic.
router.get('/:topicId', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const topicId = req.params.topicId as string
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where = [{ field: 'topic_id', operator: '=' as const, value: topicId }]
    const posts = await findMany('posts', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    const total = await count('posts', where)
    res.json({ data: posts, total, page, limit })
  } catch (error) {
    logger.error('posts.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create a reply.
router.post('/:topicId', validateBody(createPostSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { body_markdown, parent_post_id } = req.body as z.infer<typeof createPostSchema>
    const topicId = req.params.topicId as string
    const topic = (await findById('topics', topicId)) as Record<string, unknown> | null
    if (!topic) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    if (topic.status === 'closed' || topic.status === 'archived') {
      res
        .status(403)
        .json({ error: t('posts.topicClosed', {}, { defaultValue: 'Topic is closed' }) })
      return
    }

    const now = new Date().toISOString()
    const result = await create('posts', {
      topic_id: topicId,
      author_id: userId,
      body_markdown,
      parent_post_id: parent_post_id ?? null,
      is_solution: false,
      created_at: now,
      updated_at: now,
    })

    // Update topic counters (best-effort).
    try {
      await updateById('topics', topicId, {
        post_count: ((topic.post_count as number) || 0) + 1,
        last_reply_at: now,
        last_reply_user_id: userId,
        updated_at: now,
      })
    } catch (_error) {
      /* best-effort counter update; post was already created successfully */
    }

    res.status(201).json(result.data)
  } catch (error) {
    logger.error('posts.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Edit a post (author OR moderator).
router.put(
  '/:topicId/:postId',
  validateBody(updatePostSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
        return
      }
      const postId = req.params.postId as string
      const existing = (await findById('posts', postId)) as Record<string, unknown> | null
      if (!existing) {
        res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
        return
      }
      if (existing.author_id !== userId && !(await isModerator(res))) {
        res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
        return
      }
      const now = new Date().toISOString()
      const result = await updateById('posts', postId, {
        body_markdown: (req.body as z.infer<typeof updatePostSchema>).body_markdown,
        edited_at: now,
        updated_at: now,
      })
      res.json(result.data)
    } catch (error) {
      logger.error('posts.update', error)
      res
        .status(500)
        .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.delete('/:topicId/:postId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const topicId = req.params.topicId as string
    const postId = req.params.postId as string
    const existing = (await findById('posts', postId)) as Record<string, unknown> | null
    if (!existing) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    if (existing.author_id !== userId && !(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    await deleteById('posts', postId)

    // Decrement topic post_count (best-effort).
    try {
      const topic = (await findById('topics', topicId)) as Record<string, unknown> | null
      if (topic) {
        await updateById('topics', topicId, {
          post_count: Math.max(0, ((topic.post_count as number) || 0) - 1),
          updated_at: new Date().toISOString(),
        })
      }
    } catch (_error) {
      /* best-effort counter update; post was already deleted successfully */
    }

    res.status(204).end()
  } catch (error) {
    logger.error('posts.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Mark as solution: thread author OR moderator only.
router.post('/:topicId/:postId/solution', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const topicId = req.params.topicId as string
    const postId = req.params.postId as string
    const topic = (await findById('topics', topicId)) as Record<string, unknown> | null
    if (!topic) {
      res.status(404).json({ error: t('topics.notFound', {}, { defaultValue: 'Topic not found' }) })
      return
    }
    if (topic.author_id !== userId && !(await isModerator(res))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const post = (await findById('posts', postId)) as Record<string, unknown> | null
    if (!post || post.topic_id !== topicId) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    const now = new Date().toISOString()
    const result = await updateById('posts', postId, { is_solution: true, updated_at: now })
    await updateById('topics', topicId, { status: 'solved', updated_at: now })

    // Award reputation to the answer's author the first time their post is accepted as the
    // solution. `reputation` is a shipped, badge-driving column (Newcomer→Elder tiers) that no
    // path ever incremented, so every member sat permanently at 0. Guard on the prior is_solution
    // flag so re-marking the same post can't award repeatedly.
    const authorId = post.author_id as string | undefined
    if (authorId && post.is_solution !== true) {
      const author = (await findById('users', authorId)) as Record<string, unknown> | null
      if (author) {
        await updateById('users', authorId, {
          reputation: Number(author.reputation ?? 0) + SOLUTION_REPUTATION_AWARD,
        })
      }
    }

    res.json(result.data)
  } catch (error) {
    logger.error('posts.markSolution', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
