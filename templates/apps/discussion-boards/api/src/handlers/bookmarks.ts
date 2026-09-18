import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { count, create, deleteById, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

// --- Schemas ---

const listQuerySchema = z.object({
  target_type: z.enum(['topic', 'post']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
})

const createBookmarkSchema = z
  .object({
    target_type: z.enum(['topic', 'post']).optional(),
    target_id: z.string().min(1).optional(),
    threadId: z.string().min(1).optional(),
    postId: z.string().min(1).optional(),
  })
  .refine((v) => (v.target_type && v.target_id) || v.threadId || v.postId, {
    message: 'Must provide threadId, postId, or target_type+target_id',
  })

// --- Helpers ---

// --- Routes ---

// List the current user's bookmarks (self-only).
router.get('/', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const { target_type, page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (target_type) where.push({ field: 'target_type', operator: '=', value: target_type })
    const bookmarks = await findMany('bookmarks', {
      where,
      limit,
      offset: (page - 1) * limit,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const total = await count('bookmarks', where)
    res.json({ data: bookmarks, total, page, limit })
  } catch (error) {
    logger.error('bookmarks.list', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Create a bookmark (self-only).
router.post('/', validateBody(createBookmarkSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof createBookmarkSchema>
    let targetType: 'topic' | 'post' = 'topic'
    let targetId: string | undefined
    if (body.threadId) {
      targetType = 'topic'
      targetId = body.threadId
    } else if (body.postId) {
      targetType = 'post'
      targetId = body.postId
    } else if (body.target_type && body.target_id) {
      targetType = body.target_type
      targetId = body.target_id
    }
    if (!targetId) {
      res.status(400).json({
        error: t('bookmarks.missingTarget', {}, { defaultValue: 'Missing bookmark target' }),
      })
      return
    }

    const existing = await findMany('bookmarks', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'target_type', operator: '=', value: targetType },
        { field: 'target_id', operator: '=', value: targetId },
      ],
      limit: 1,
    })
    if (existing[0]) {
      res.status(200).json(existing[0])
      return
    }

    const now = new Date().toISOString()
    const result = await create('bookmarks', {
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      created_at: now,
      updated_at: now,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('bookmarks.create', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Delete a bookmark — only the owner may delete.
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = req.params.id as string
    const existing = (await findById('bookmarks', id)) as Record<string, unknown> | null
    if (!existing) {
      res
        .status(404)
        .json({ error: t('bookmarks.notFound', {}, { defaultValue: 'Bookmark not found' }) })
      return
    }
    if (existing.user_id !== userId) {
      res.status(403).json({ error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }) })
      return
    }
    await deleteById('bookmarks', id)
    res.status(204).end()
  } catch (error) {
    logger.error('bookmarks.delete', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
