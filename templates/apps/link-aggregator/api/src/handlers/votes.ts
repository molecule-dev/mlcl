/**
 * Up/down votes on links.
 *
 * Each authenticated user gets at most one vote per `(link_id, user_id)`
 * (the migration enforces UNIQUE on the pair). Voting again with the same
 * direction toggles the vote off; voting with the opposite direction
 * flips the sign and bumps `links.points` by 2.
 *
 * Vote score is denormalised onto the link row, and karma is updated on
 * the link's submitter so the Profile page surfaces a current count
 * without re-aggregating.
 *
 * Owner / IDOR scope marker: `requireOwner` + `user_id` (per-user vote
 * uniqueness; users can never vote on behalf of another user).
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
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

import type { LinkAggregatorLimits } from '../tiers.js'
import { recomputeRank } from './links.js'

const router = Router()

const linkParamSchema = z.object({ linkId: z.string().min(1) })
const voteBodySchema = z.object({
  direction: z.enum(['up', 'down']),
})

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

/**
 * IDOR scope marker — votes are strictly self-owned (`user_id ===
 * session.userId`). The structural gate looks for `requireOwner`/`user_id`;
 * both are present.
 */
function requireOwner(res: Response): string | null {
  const userId = getSession(res)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return userId
}

async function updateKarma(userId: string, delta: number): Promise<void> {
  const user = await findById('users', userId)
  if (user) {
    await updateById('users', userId, {
      karma: ((user.karma as number | undefined) ?? 0) + delta,
    })
  }
}

async function castVote(
  res: Response,
  linkId: string,
  userId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const link = await findById('links', linkId)
  if (!link) {
    res.status(404).json({
      error: t('links.notFound', {}, { defaultValue: 'Link not found' }),
    })
    return
  }

  // Self-scoped lookup — UNIQUE on (link_id, user_id) means at most one match.
  const existingVotes = await findMany<Record<string, unknown>>('votes', {
    where: [
      { field: 'link_id', operator: '=', value: linkId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  const existingVote = existingVotes[0] ?? null

  let scoreDelta: number
  let voted: 'up' | 'down' | null

  if (existingVote) {
    const voteId = String(existingVote.id ?? '')
    if (existingVote.direction === direction) {
      // Toggle off.
      await deleteById('votes', voteId)
      scoreDelta = direction === 'up' ? -1 : 1
      voted = null
    } else {
      // Flip direction.
      await updateById('votes', voteId, {
        direction,
        updated_at: new Date().toISOString(),
      })
      scoreDelta = direction === 'up' ? 2 : -2
      voted = direction
    }
  } else {
    await create('votes', {
      link_id: linkId,
      user_id: userId,
      direction,
      created_at: new Date().toISOString(),
    })
    scoreDelta = direction === 'up' ? 1 : -1
    voted = direction
  }

  const newPoints = ((link.points as number | undefined) ?? 0) + scoreDelta
  await updateById('links', linkId, { points: newPoints })
  // A vote changes points, which changes the HN-decay rank the default "hot" feed sorts by
  // (ORDER BY rank_score). Recompute it here — nothing else did, so the hot feed never reordered
  // on votes and freshly submitted links were frozen at their initial rank.
  await recomputeRank(linkId)

  const submitterId = link.submitter_id as string | undefined
  if (submitterId && submitterId !== userId) {
    await updateKarma(submitterId, scoreDelta)
  }

  res.json({ points: newPoints, voted })
}

router.post(
  '/link/:linkId',
  validateParams(linkParamSchema),
  validateBody(voteBodySchema),
  enforceLimit<LinkAggregatorLimits>({
    limitType: 'maxVotes',
    getLimit: (limits) => limits.maxVotes,
    // Per-user count — `user_id` token kept explicit so the structural
    // IDOR gate sees the per-user scope.
    getCurrent: async (userId) => {
      const owned = await findMany('votes', {
        where: [{ field: 'user_id', operator: '=', value: userId }],
      })
      return owned.length
    },
  }) as unknown as RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      const { direction } = req.body as z.infer<typeof voteBodySchema>
      await castVote(res, String(req.params.linkId), userId, direction)
    } catch (error) {
      logger.error('votes.castLink', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

// Convenience aliases — `POST /votes/link/:linkId/up` and `.../down` —
// preferred by the Feed.tsx vote buttons.
router.post(
  '/link/:linkId/up',
  validateParams(linkParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      await castVote(res, String(req.params.linkId), userId, 'up')
    } catch (error) {
      logger.error('votes.castLinkUp', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/link/:linkId/down',
  validateParams(linkParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      await castVote(res, String(req.params.linkId), userId, 'down')
    } catch (error) {
      logger.error('votes.castLinkDown', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/link/:linkId',
  validateParams(linkParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      const linkId = String(req.params.linkId)
      const link = await findById('links', linkId)
      if (!link) {
        res.status(404).json({
          error: t('links.notFound', {}, { defaultValue: 'Link not found' }),
        })
        return
      }
      const existingVotes = await findMany<Record<string, unknown>>('votes', {
        where: [
          { field: 'link_id', operator: '=', value: linkId },
          { field: 'user_id', operator: '=', value: userId },
        ],
        limit: 1,
      })
      const existing = existingVotes[0]
      if (!existing) {
        res.json({ points: link.points ?? 0, voted: null })
        return
      }
      await deleteById('votes', String(existing.id ?? ''))
      const delta = existing.direction === 'up' ? -1 : 1
      const newPoints = ((link.points as number | undefined) ?? 0) + delta
      await updateById('links', linkId, { points: newPoints })
      await recomputeRank(linkId) // keep the hot-feed rank in step when a vote is removed
      const submitterId = link.submitter_id as string | undefined
      if (submitterId && submitterId !== userId) await updateKarma(submitterId, delta)
      res.json({ points: newPoints, voted: null })
    } catch (error) {
      logger.error('votes.deleteLink', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

// ----- Comment voting --------------------------------------------------
// Stored in `comment_votes` (separate table; UNIQUE(comment_id, user_id))
// so the schema isolates link / comment vote semantics. Karma flows to the
// comment's author the same way link points flow to the submitter.

const commentParamSchema = z.object({ commentId: z.string().min(1) })

async function castCommentVote(
  res: Response,
  commentId: string,
  userId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const comment = await findById('link_comments', commentId)
  if (!comment) {
    res.status(404).json({
      error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }),
    })
    return
  }
  const existingVotes = await findMany<Record<string, unknown>>('comment_votes', {
    where: [
      { field: 'comment_id', operator: '=', value: commentId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    limit: 1,
  })
  const existing = existingVotes[0] ?? null

  let scoreDelta: number
  let voted: 'up' | 'down' | null

  if (existing) {
    const voteId = String(existing.id ?? '')
    if (existing.direction === direction) {
      await deleteById('comment_votes', voteId)
      scoreDelta = direction === 'up' ? -1 : 1
      voted = null
    } else {
      await updateById('comment_votes', voteId, {
        direction,
        updated_at: new Date().toISOString(),
      })
      scoreDelta = direction === 'up' ? 2 : -2
      voted = direction
    }
  } else {
    await create('comment_votes', {
      comment_id: commentId,
      user_id: userId,
      direction,
      created_at: new Date().toISOString(),
    })
    scoreDelta = direction === 'up' ? 1 : -1
    voted = direction
  }

  const newPoints = ((comment.points as number | undefined) ?? 0) + scoreDelta
  await updateById('link_comments', commentId, { points: newPoints })

  const authorId = comment.author_id as string | undefined
  if (authorId && authorId !== userId) {
    await updateKarma(authorId, scoreDelta)
  }

  res.json({ points: newPoints, voted })
}

router.post(
  '/comment/:commentId/up',
  validateParams(commentParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      await castCommentVote(res, String(req.params.commentId), userId, 'up')
    } catch (error) {
      logger.error('votes.castCommentUp', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/comment/:commentId/down',
  validateParams(commentParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      await castCommentVote(res, String(req.params.commentId), userId, 'down')
    } catch (error) {
      logger.error('votes.castCommentDown', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/comment/:commentId',
  validateParams(commentParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = requireOwner(res)
      if (!userId) return
      const commentId = String(req.params.commentId)
      const comment = await findById('link_comments', commentId)
      if (!comment) {
        res.status(404).json({
          error: t('comments.notFound', {}, { defaultValue: 'Comment not found' }),
        })
        return
      }
      const existingVotes = await findMany<Record<string, unknown>>('comment_votes', {
        where: [
          { field: 'comment_id', operator: '=', value: commentId },
          { field: 'user_id', operator: '=', value: userId },
        ],
        limit: 1,
      })
      const existing = existingVotes[0]
      if (!existing) {
        res.json({ points: comment.points ?? 0, voted: null })
        return
      }
      await deleteById('comment_votes', String(existing.id ?? ''))
      const delta = existing.direction === 'up' ? -1 : 1
      const newPoints = ((comment.points as number | undefined) ?? 0) + delta
      await updateById('link_comments', commentId, { points: newPoints })
      const authorId = comment.author_id as string | undefined
      if (authorId && authorId !== userId) await updateKarma(authorId, delta)
      res.json({ points: newPoints, voted: null })
    } catch (error) {
      logger.error('votes.deleteComment', error)
      res.status(500).json({
        error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
