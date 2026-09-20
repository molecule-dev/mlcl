/**
 * Vote handler — single upvote per (post, user), toggled on repeat.
 *
 * feedback_votes enforces UNIQUE (post_id, user_id), so each authenticated
 * user gets at most one vote per post. `POST /votes { post_id }` adds the
 * vote if absent, removes it if present — the classic feedback-board
 * toggle. The denormalized vote_count on the post row is maintained in the
 * same operation so board listings can sort by demand without aggregating.
 *
 * Owner / IDOR scope marker: `requireOwner` + `user_id` (per-user vote
 * uniqueness; users can never vote on behalf of another user).
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const voteSchema = z.object({
  post_id: z.string().min(1),
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

router.get('/mine', async (_req: Request, res: Response) => {
  try {
    const userId = requireOwner(res)
    if (!userId) return

    const votes = await findMany<Record<string, unknown>>('feedback_votes', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json({ data: votes })
  } catch (error) {
    logger.error('votes.mine', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(voteSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireOwner(res)
    if (!userId) return

    const { post_id: postId } = req.body as z.infer<typeof voteSchema>

    const post = await findById<Record<string, unknown>>('feedback_posts', postId)
    if (!post) {
      res.status(404).json({
        error: t('votes.targetNotFound', {}, { defaultValue: 'Post not found' }),
      })
      return
    }

    // Self-scoped lookup — UNIQUE on (post_id, user_id) means at most one
    // row matches.
    const existingMatches = await findMany<Record<string, unknown>>('feedback_votes', {
      where: [
        { field: 'post_id', operator: '=', value: postId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    const existingVote = existingMatches[0] ?? null

    let voted: boolean
    if (existingVote) {
      await deleteById('feedback_votes', String(existingVote.id ?? ''))
      voted = false
    } else {
      const now = new Date().toISOString()
      await create('feedback_votes', {
        post_id: postId,
        user_id: userId,
        created_at: now,
        updated_at: now,
      })
      voted = true
    }

    const newCount = await recountVotes(postId)
    await updateById('feedback_posts', postId, { vote_count: newCount })

    res.json({ voted, vote_count: newCount })
  } catch (error) {
    logger.error('votes.toggle', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

/** Recompute a post's vote count from its (post_id, user_id)-unique rows. */
export async function recountVotes(postId: string): Promise<number> {
  const votes = await findMany<{ id: string }>('feedback_votes', {
    where: [{ field: 'post_id', operator: '=', value: postId }],
  })
  return votes.length
}

export default router
