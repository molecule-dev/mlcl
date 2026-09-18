import type { Request, Response } from 'express'
import { Router } from 'express'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router({ mergeParams: true })
const bookmarksRouter = Router()

async function getClaps(postId: string): Promise<number> {
  return count('reactions', [
    { field: 'resourceType', operator: '=', value: 'post' },
    { field: 'resourceId', operator: '=', value: postId },
    { field: 'type', operator: '=', value: 'clap' },
  ])
}

async function getCommentCount(postId: string): Promise<number> {
  return count('comments', [
    { field: 'resourceType', operator: '=', value: 'post' },
    { field: 'resourceId', operator: '=', value: postId },
  ])
}

async function getUserClap(
  postId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const rows = await findMany<Record<string, unknown>>('reactions', {
    where: [
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'resourceId', operator: '=', value: postId },
      { field: 'userId', operator: '=', value: userId },
      { field: 'type', operator: '=', value: 'clap' },
    ],
    limit: 1,
  })
  return rows[0] ?? null
}

async function getUserBookmark(
  postId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const rows = await findMany<Record<string, unknown>>('bookmarks', {
    where: [
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'resourceId', operator: '=', value: postId },
      { field: 'userId', operator: '=', value: userId },
    ],
    limit: 1,
  })
  return rows[0] ?? null
}

// GET /posts/:id/interactions — summary for the current viewer
router.get('/:id/interactions', async (req: Request, res: Response) => {
  try {
    const postId = getParamId(req)
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (!post) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    const userId = getUserId(res)
    const [claps, comment_count] = await Promise.all([getClaps(postId), getCommentCount(postId)])
    let clapped = false
    let bookmarked = false
    if (userId) {
      const [c, b] = await Promise.all([
        getUserClap(postId, userId),
        getUserBookmark(postId, userId),
      ])
      clapped = Boolean(c)
      bookmarked = Boolean(b)
    }
    res.json({
      claps,
      clapped,
      bookmarked,
      comment_count,
      views: Number(post.views ?? 0) || 0,
    })
  } catch (err) {
    console.error('[posts.interactions]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// POST /posts/:id/view — bump the views counter
router.post('/:id/view', async (req: Request, res: Response) => {
  try {
    const postId = getParamId(req)
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (!post) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    await query(`UPDATE posts SET views = COALESCE(views, 0) + 1 WHERE id = $1`, [postId])
    const refreshed = await findById<Record<string, unknown>>('posts', postId)
    res.json({ id: postId, views: Number(refreshed?.views ?? 0) || 0 })
  } catch (err) {
    console.error('[posts.view]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// POST /posts/:id/clap — add a clap reaction (idempotent for the user)
router.post('/:id/clap', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const postId = getParamId(req)
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (!post) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    const existing = await getUserClap(postId, userId)
    if (!existing) {
      const now = new Date().toISOString()
      await create('reactions', {
        resourceType: 'post',
        resourceId: postId,
        userId,
        type: 'clap',
        createdAt: now,
        updatedAt: now,
      })
    }
    const claps = await getClaps(postId)
    res.status(201).json({ clapped: true, claps })
  } catch (err) {
    console.error('[posts.clap]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// DELETE /posts/:id/clap — remove the user's clap (idempotent)
router.delete('/:id/clap', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const postId = getParamId(req)
    const existing = await getUserClap(postId, userId)
    if (existing) {
      await deleteById('reactions', String(existing.id))
    }
    const claps = await getClaps(postId)
    res.json({ clapped: false, claps })
  } catch (err) {
    console.error('[posts.clap.delete]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// POST /posts/:id/bookmark — bookmark the post for the current user
router.post('/:id/bookmark', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const postId = getParamId(req)
    const post = await findById<Record<string, unknown>>('posts', postId)
    if (!post) {
      res.status(404).json({ error: t('posts.notFound', {}, { defaultValue: 'Post not found' }) })
      return
    }
    const existing = await getUserBookmark(postId, userId)
    if (!existing) {
      const now = new Date().toISOString()
      await create('bookmarks', {
        resourceType: 'post',
        resourceId: postId,
        userId,
        createdAt: now,
        updatedAt: now,
      })
    }
    res.status(201).json({ bookmarked: true })
  } catch (err) {
    console.error('[posts.bookmark]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// DELETE /posts/:id/bookmark — remove a bookmark
router.delete('/:id/bookmark', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const postId = getParamId(req)
    const existing = await getUserBookmark(postId, userId)
    if (existing) {
      await deleteById('bookmarks', String(existing.id))
    }
    res.json({ bookmarked: false })
  } catch (err) {
    console.error('[posts.bookmark.delete]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// GET /bookmarks/mine — list the current user's bookmarked posts
bookmarksRouter.get('/mine', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const where: WhereCondition[] = [
      { field: 'resourceType', operator: '=', value: 'post' },
      { field: 'userId', operator: '=', value: userId },
    ]
    const rows = await findMany<Record<string, unknown>>('bookmarks', {
      where,
      limit: 100,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    res.json({ data: rows, total: rows.length })
  } catch (err) {
    console.error('[posts.bookmarks.list]', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export { bookmarksRouter }
export default router
