/**
 * Comments handler — owner-edits, world-readable threads.
 *
 * Per INVENTORY: a commenter can edit/delete their own comment; the channel
 * owner can also delete any comment on their video. Reads are open to any
 * authenticated user.
 *
 * Backed by the molecule-shipped `comments` table (camelCase: `resourceType`,
 * `resourceId`, `userId`, `parentId`, `body`). Each comment row is keyed to
 * a video with `(resourceType='video', resourceId=videoId)`.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const listQuerySchema = z.object({ video_id: z.string().uuid() })

const createCommentSchema = z.object({
  video_id: z.string().uuid(),
  parent_id: z.string().uuid().nullable().optional(),
  body: z.string().min(1).max(5000),
})

const updateCommentSchema = z.object({
  body: z.string().min(1).max(5000),
})

router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const { video_id } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [
      { field: 'resourceType', operator: '=', value: 'video' },
      { field: 'resourceId', operator: '=', value: String(video_id) },
    ]
    const orderBy: OrderBy[] = [{ field: 'createdAt', direction: 'asc' }]
    const items = await findMany('comments', { where, orderBy, limit: 200 })
    res.json(items)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(createCommentSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { video_id, parent_id, body } = req.body as z.infer<typeof createCommentSchema>
    const video = await findById<Record<string, unknown>>('videos', video_id)
    if (!video) {
      res
        .status(404)
        .json({ error: t('videos.notFound', undefined, { defaultValue: 'Video not found' }) })
      return
    }
    const result = await create('comments', {
      resourceType: 'video',
      resourceId: video_id,
      userId,
      parentId: parent_id ?? null,
      body,
    })
    await updateById('videos', video_id, {
      comment_count: ((video.comment_count as number) ?? 0) + 1,
      updated_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCommentSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findById<Record<string, unknown>>('comments', idOf(req))
      if (!existing) {
        res
          .status(404)
          .json({ error: t('comments.notFound', undefined, { defaultValue: 'Comment not found' }) })
        return
      }
      if (existing.userId !== userId) {
        res
          .status(403)
          .json({ error: t('comments.forbidden', undefined, { defaultValue: 'Not your comment' }) })
        return
      }
      const { body } = req.body as z.infer<typeof updateCommentSchema>
      const result = await updateById('comments', idOf(req), {
        body,
        editedAt: new Date(),
      })
      res.json(result.data ?? result)
    } catch (error) {
      console.error(error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const existing = await findById<Record<string, unknown>>('comments', idOf(req))
    if (!existing) {
      res
        .status(404)
        .json({ error: t('comments.notFound', undefined, { defaultValue: 'Comment not found' }) })
      return
    }
    let allowed = existing.userId === userId
    if (!allowed && existing.resourceType === 'video') {
      const video = await findById<Record<string, unknown>>('videos', existing.resourceId as string)
      if (video?.user_id === userId) allowed = true
    }
    if (!allowed) {
      res
        .status(403)
        .json({ error: t('comments.forbidden', undefined, { defaultValue: 'Not your comment' }) })
      return
    }
    await deleteById('comments', idOf(req))
    // Keep the denormalized count in sync: the create path increments
    // videos.comment_count, so a delete must decrement it — otherwise the
    // displayed comment count drifts upward as comments are removed. Math.max
    // guards against going negative if the count ever drifts.
    if (existing.resourceType === 'video' && existing.resourceId) {
      const video = await findById<Record<string, unknown>>('videos', String(existing.resourceId))
      if (video) {
        await updateById('videos', String(existing.resourceId), {
          comment_count: Math.max(0, ((video.comment_count as number) ?? 0) - 1),
          updated_at: new Date(),
        })
      }
    }
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
