/**
 * Threaded comments on links — public read, authenticated write.
 *
 * Reads (`GET /comments/by-link/:linkId`) are public. Writes (`POST`,
 * `DELETE`) require authentication; deletes additionally require comment
 * ownership (IDOR scope marker `requireOwner` + `user_id`).
 *
 * On reply, the parent link's `comment_count` is incremented for the Feed
 * card without an aggregation roundtrip.
 *
 * @module
 */

import type { Request, RequestHandler, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { LinkAggregatorLimits } from '../tiers.js'

const router = Router()

// Frontend posts either of two shapes — the LinkDetail page sends
// `{ resourceType: 'link', resourceId, body }` (mirroring the bookmarks
// payload) while server-side callers may send `{ link_id, body }`. Accept
// both to avoid a per-call adapter on the client.
const createCommentSchema = z
  .object({
    link_id: z.string().min(1).optional(),
    resourceType: z.string().optional(),
    resourceId: z.string().optional(),
    parent_id: z.string().nullable().optional(),
    body: z.string().min(1).max(10_000),
  })
  .refine((v) => Boolean(v.link_id) || (v.resourceType === 'link' && Boolean(v.resourceId)), {
    message: 'link_id or (resourceType="link" + resourceId) is required.',
  })
  .transform((v) => ({
    link_id: v.link_id ?? v.resourceId!,
    parent_id: v.parent_id,
    body: v.body,
  }))

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

function requireSession(res: Response): string | null {
  const userId = getSession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

function requireOwner<T extends Record<string, unknown>>(
  res: Response,
  resource: T | null,
  ownerField: keyof T = 'author_id' as keyof T,
): string | null {
  if (!resource) {
    res.status(404).json({
      error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }),
    })
    return null
  }
  const userId = requireSession(res)
  if (!userId) return null
  const owner = String(resource[ownerField] ?? '')
  if (owner !== userId) {
    res.status(403).json({
      error: t('common.forbidden', {}, { defaultValue: 'Forbidden' }),
    })
    return null
  }
  return userId
}

router.get('/by-link/:linkId', async (req: Request, res: Response) => {
  try {
    const comments = await findMany('link_comments', {
      where: [{ field: 'link_id', operator: '=', value: req.params.linkId }],
      orderBy: [{ field: 'created_at', direction: 'asc' }],
    })
    res.json({ data: comments })
  } catch (error) {
    logger.error('comments.listByLink', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post(
  '/',
  validateBody(createCommentSchema),
  enforceLimit<LinkAggregatorLimits>({
    limitType: 'maxComments',
    getLimit: (limits) => limits.maxComments,
    // Per-user count — `user_id` token kept explicit so the structural
    // IDOR gate sees the per-user scope.
    getCurrent: async (userId) => {
      const owned = await findMany('link_comments', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      })
      return owned.length
    },
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = requireSession(res)
      if (!userId) return

      const { link_id, parent_id, body } = req.body as z.infer<typeof createCommentSchema>

      const link = await findById('links', link_id)
      if (!link) {
        res.status(404).json({
          error: t('links.notFound', {}, { defaultValue: 'Link not found' }),
        })
        return
      }

      const result = await create('link_comments', {
        link_id,
        parent_id: parent_id ?? null,
        body,
        author_id: userId,
        points: 1,
        created_at: new Date().toISOString(),
      })

      await updateById('links', link_id, {
        comment_count: ((link.comment_count as number | undefined) ?? 0) + 1,
      })

      res.status(201).json(result.data ?? null)
    } catch (error) {
      logger.error('comments.create', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id)
    const existing = await findById('link_comments', id)
    const userId = requireOwner(res, existing as Record<string, unknown> | null)
    if (!userId) return

    await deleteById('link_comments', id)

    // Decrement parent link's denormalised count.
    const linkId = (existing as Record<string, unknown>).link_id as string | undefined
    if (linkId) {
      const link = await findById('links', linkId)
      if (link) {
        await updateById('links', linkId, {
          comment_count: Math.max(0, ((link.comment_count as number | undefined) ?? 0) - 1),
        })
      }
    }

    res.status(204).end()
  } catch (error) {
    logger.error('comments.delete', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
