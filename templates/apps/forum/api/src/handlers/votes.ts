/**
 * Vote handler — up/down votes on threads or replies.
 *
 * Each authenticated user gets at most one vote per `(target_type, target_id)`
 * (the migration enforces UNIQUE on the trio). Voting again with the same
 * direction toggles the vote off; voting with the opposite direction flips
 * the sign and bumps the score by 2.
 *
 * Vote score is denormalised onto the target row, and reputation is updated
 * on the target's author so the Profile page surfaces a current count
 * without re-aggregating.
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
  target_type: z.enum(['thread', 'reply']),
  target_id: z.string().min(1),
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

router.post('/', validateBody(voteSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireOwner(res)
    if (!userId) return

    const { target_type, target_id, direction } = req.body as z.infer<typeof voteSchema>
    const table = target_type === 'thread' ? 'threads' : 'replies'

    const target = await findById<Record<string, unknown>>(table, target_id)
    if (!target) {
      res.status(404).json({
        error: t('votes.targetNotFound', {}, { defaultValue: 'Target not found' }),
      })
      return
    }

    // Self-scoped lookup — UNIQUE on (target_type, target_id, user_id) means
    // at most one row matches.
    const existingMatches = await findMany<Record<string, unknown>>('votes', {
      where: [
        { field: 'target_type', operator: '=', value: target_type },
        { field: 'target_id', operator: '=', value: target_id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    const existingVote = existingMatches[0] ?? null

    let scoreDelta = 0

    if (existingVote) {
      const voteId = String(existingVote.id ?? '')
      if (existingVote.direction === direction) {
        await deleteById('votes', voteId)
        scoreDelta = direction === 'up' ? -1 : 1
      } else {
        await updateById('votes', voteId, {
          direction,
          updated_at: new Date().toISOString(),
        })
        scoreDelta = direction === 'up' ? 2 : -2
      }
    } else {
      await create('votes', {
        target_type,
        target_id,
        user_id: userId,
        direction,
        created_at: new Date().toISOString(),
      })
      scoreDelta = direction === 'up' ? 1 : -1
    }

    const newScore = ((target.vote_score as number | undefined) ?? 0) + scoreDelta
    await updateById(table, target_id, { vote_score: newScore })

    const authorId = target.author_id as string | undefined
    if (authorId) {
      const author = await findById<Record<string, unknown>>('users', authorId)
      if (author) {
        const newReputation = ((author.reputation as number | undefined) ?? 0) + scoreDelta
        await updateById('users', authorId, { reputation: newReputation })
      }
    }

    res.json({ vote_score: newScore })
  } catch (error) {
    logger.error('votes.cast', error)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
