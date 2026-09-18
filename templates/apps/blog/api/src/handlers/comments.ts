import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const listQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'approved', 'spam']).optional().default('all'),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
})

const createCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  resourceType: z.string().min(1).max(50),
  resourceId: z.string().min(1).max(255),
  parentId: z.string().uuid().optional(),
})

const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000).optional(),
  status: z.enum(['pending', 'approved', 'spam']).optional(),
})

// A moderator/admin may moderate (approve, mark spam, edit/delete) ANY
// comment site-wide. A post author is the moderator of comments on THEIR
// OWN posts (the /comments dashboard is the author's own moderation queue),
// and any user may edit/delete their OWN comment.
async function isModerator(userId: string): Promise<boolean> {
  const user = await findById<Record<string, unknown>>('users', userId)
  const role = user?.role
  return role === 'moderator' || role === 'admin'
}

// True when `userId` authored the post a comment is attached to. Blog authors
// moderate comments on their own posts without needing the site-wide
// moderator/admin role.
async function authoredPost(
  userId: string,
  resourceType: unknown,
  resourceId: unknown,
): Promise<boolean> {
  if (resourceType !== 'post' || typeof resourceId !== 'string' || !resourceId) return false
  const post = await findById<Record<string, unknown>>('posts', resourceId)
  return !!post && post.author_id === userId
}

// May `userId` moderate (approve / spam / delete others') the given comment?
// True for a site-wide moderator/admin OR the author of the post the comment
// belongs to.
async function canModerateComment(
  userId: string,
  comment: Record<string, unknown>,
): Promise<boolean> {
  if (await isModerator(userId)) return true
  return authoredPost(userId, comment.resourceType, comment.resourceId)
}

// List comments. Auth required. The moderation queue (all statuses, honoring
// the ?status filter) is available to a site-wide moderator/admin and to the
// author of the post being filtered (?resourceType=post&resourceId=…) — the
// /comments dashboard is the author's own moderation queue. Everyone else is
// scoped to their OWN comments so an unprivileged user can't enumerate other
// people's pending/spam rows by passing the filter, but still sees what they
// themselves wrote.
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { status, resourceType, resourceId, page, limit } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >
    // Moderation scope: a site-wide moderator/admin OR the author of the post
    // being filtered gets the full moderation list (all statuses honoring the
    // client filter). Everyone else is scoped to their OWN comments so an
    // unprivileged user can neither read approved-only nor enumerate other
    // people's pending/spam rows — but always sees what they themselves wrote.
    const moderator =
      (await isModerator(userId)) || (await authoredPost(userId, resourceType, resourceId))
    const where: WhereCondition[] = []
    if (moderator) {
      // Honor the client status filter for the moderation queue.
      if (status && status !== 'all') {
        where.push({ field: 'status', operator: '=', value: status })
      }
    } else {
      // Non-moderators are scoped to their own comments (any status), which
      // prevents enumerating other users' unmoderated rows while still letting
      // an author see the comments they just posted.
      where.push({ field: 'userId', operator: '=', value: userId })
      if (status && status !== 'all') {
        where.push({ field: 'status', operator: '=', value: status })
      }
    }
    if (resourceType) where.push({ field: 'resourceType', operator: '=', value: resourceType })
    if (resourceId) where.push({ field: 'resourceId', operator: '=', value: resourceId })

    const comments = await findMany('comments', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })
    const total = await count('comments', where)
    res.json({ data: comments, total, page, limit })
  } catch (error) {
    logger.error('comments.list failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Get one comment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const comment = await findById('comments', getParamId(req))
    if (!comment) {
      res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
      return
    }
    res.json(comment)
  } catch (error) {
    logger.error('comments.getById failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create a comment
router.post('/', validateBody(createCommentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { body, resourceType, resourceId, parentId } = req.body
    const now = new Date().toISOString()
    const result = await create('comments', {
      body,
      resourceType,
      resourceId,
      userId,
      parentId: parentId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('comments.create failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Update / moderate a comment (approve, mark spam, edit body)
router.patch('/:id', validateBody(updateCommentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('comments', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
      return
    }
    // Authorization: a comment's own author may edit its body; flipping the
    // moderation `status` (approve / mark spam) is a moderation action allowed
    // for a site-wide moderator/admin OR the author of the post the comment is
    // on. Anyone who is neither owner nor moderator-of-this-comment is
    // forbidden from touching it at all.
    const moderator = await canModerateComment(userId, existing)
    const isOwner = existing.userId === userId
    if (!isOwner && !moderator) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const { status } = req.body as z.infer<typeof updateCommentSchema>
    if (status !== undefined && !moderator) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    const updates: Record<string, unknown> = { ...req.body, updatedAt: new Date().toISOString() }
    const result = await updateById('comments', id, updates)
    res.json(result.data)
  } catch (error) {
    logger.error('comments.update failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete a comment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('comments', id)
    if (!existing) {
      res
        .status(404)
        .json({ error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }) })
      return
    }
    // Authorization: a comment's own author may delete it; deleting anyone
    // else's comment is a moderation action allowed for a site-wide
    // moderator/admin OR the author of the post the comment is on.
    const isOwner = existing.userId === userId
    if (!isOwner && !(await canModerateComment(userId, existing))) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    await deleteById('comments', id)
    res.status(204).end()
  } catch (error) {
    logger.error('comments.delete failed', { error })
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
