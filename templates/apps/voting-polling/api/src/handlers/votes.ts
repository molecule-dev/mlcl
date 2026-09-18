import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

const getPollId = (req: Request): string => {
  const id = req.params.pollId
  return Array.isArray(id) ? id[0] : id
}

/**
 * Strip the voter-identifying fields from a vote row for a secret-ballot poll.
 * `allow_anonymous` promises "voter names hidden in the audit log" while tallies
 * stay authenticated — so the ballot stream must not expose who cast each vote.
 * The stored `user_id` still drives authentication + the one-vote-per-user guard
 * server-side; this only redacts what is SERVED.
 */
const redactVoter = (vote: Record<string, unknown>): Record<string, unknown> => ({
  ...vote,
  user_id: null,
  voter_id: null,
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

const castVoteSchema = z.object({
  poll_id: z.string().uuid(),
  option_index: z.union([z.number().int().min(0), z.array(z.number().int().min(0))]).optional(),
  ranked_choices: z.array(z.number().int().min(0)).optional(),
  open_text: z.string().min(1).max(5000).optional(),
})

router.get('/poll/:pollId', validateQuery(listQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const pollId = getPollId(req)
    const poll = await findById<Record<string, unknown>>('polls', pollId)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    const { page, limit } = req.query as unknown as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'poll_id', operator: '=', value: pollId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const votes = await findMany<Record<string, unknown>>('votes', {
      where,
      orderBy,
      limit,
      offset: (page - 1) * limit,
    })
    // Secret-ballot polls hide voter identity in the audit stream.
    res.json(poll.allow_anonymous === true ? votes.map(redactVoter) : votes)
  } catch (err) {
    logger.error('votes.list', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(castVoteSchema), async (req: Request, res: Response) => {
  try {
    const body = req.body as z.infer<typeof castVoteSchema>
    const userId = getUserId(res)

    // Auth check FIRST so anonymous /api/votes always responds 401, even
    // when the poll referenced in the payload doesn't exist. Anonymous
    // share-token voting (poll.allow_anonymous = true) goes through a
    // separate public endpoint — see the BLOCKED note in
    // e2e/votes.spec.ts and STATUS.md ## Blockers.
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }

    const poll = await findById<Record<string, unknown>>('polls', body.poll_id)
    if (!poll) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    if (poll.status !== 'active') {
      res.status(409).json({
        error: t(
          'votes.pollNotActive',
          {},
          {
            defaultValue: 'This poll is not currently accepting votes',
          },
        ),
      })
      return
    }
    const now = new Date()
    if (poll.start_date && new Date(String(poll.start_date)) > now) {
      res.status(409).json({
        error: t('votes.pollNotStarted', {}, { defaultValue: 'This poll has not started yet' }),
      })
      return
    }
    if (poll.end_date && new Date(String(poll.end_date)) < now) {
      res
        .status(410)
        .json({ error: t('votes.pollExpired', {}, { defaultValue: 'This poll has expired' }) })
      return
    }

    const maxVotes = Number(poll.max_votes_per_user ?? 1)
    if (userId) {
      const existingCount = await count('votes', [
        { field: 'poll_id', operator: '=', value: body.poll_id },
        { field: 'user_id', operator: '=', value: userId },
      ])
      if (existingCount >= maxVotes) {
        res.status(409).json({
          error: t(
            'votes.alreadyVoted',
            {},
            {
              defaultValue: 'You have reached the maximum number of votes for this poll',
            },
          ),
        })
        return
      }
    }

    const pollType = String(poll.type)
    const options = Array.isArray(poll.options) ? (poll.options as unknown[]) : []

    if (pollType === 'single-choice') {
      const idx = body.option_index
      if (typeof idx !== 'number' || idx < 0 || idx >= options.length) {
        res.status(400).json({
          error: t('votes.invalidOption', {}, { defaultValue: 'Invalid option selected' }),
        })
        return
      }
    } else if (pollType === 'multiple-choice') {
      const indices = body.option_index
      if (!Array.isArray(indices) || indices.length === 0) {
        res.status(400).json({
          error: t('votes.selectAtLeastOne', {}, { defaultValue: 'Select at least one option' }),
        })
        return
      }
      if (indices.some((i: number) => i < 0 || i >= options.length)) {
        res.status(400).json({
          error: t('votes.invalidOption', {}, { defaultValue: 'Invalid option selected' }),
        })
        return
      }
      // Enforce the poll's "max selections per voter" cap server-side. The client limits the
      // checkboxes, but a direct API call could otherwise select more options than allowed.
      if (indices.length > maxVotes) {
        res.status(400).json({
          error: t(
            'votes.tooManySelections',
            { max: maxVotes },
            {
              defaultValue: `Select at most ${maxVotes} option${maxVotes === 1 ? '' : 's'}`,
            },
          ),
        })
        return
      }
    } else if (pollType === 'ranked') {
      if (!Array.isArray(body.ranked_choices) || body.ranked_choices.length !== options.length) {
        res.status(400).json({
          error: t('votes.rankAllOptions', {}, { defaultValue: 'All options must be ranked' }),
        })
        return
      }
    } else if (pollType === 'open-text') {
      if (!body.open_text || body.open_text.trim().length === 0) {
        res.status(400).json({
          error: t('votes.textRequired', {}, { defaultValue: 'A text response is required' }),
        })
        return
      }
    }

    // jsonb columns must be JSON.stringify'd — see polls.ts for the same
    // pattern. `null` stays as null so the column accepts the missing
    // variant for poll types that don't use it.
    const selectedOptions =
      pollType === 'multiple-choice' && body.option_index !== undefined
        ? JSON.stringify(body.option_index)
        : null
    const rankedChoices =
      pollType === 'ranked' && body.ranked_choices !== undefined
        ? JSON.stringify(body.ranked_choices)
        : null

    const vote = await create<Record<string, unknown>>('votes', {
      poll_id: body.poll_id,
      user_id: userId,
      voter_id: userId ?? null,
      option_index: pollType === 'single-choice' ? body.option_index : null,
      selected_options: selectedOptions,
      ranked_choices: rankedChoices,
      open_text: pollType === 'open-text' ? body.open_text?.trim() : null,
      source: 'web',
      created_at: now,
    })

    const voteId = vote.data?.id ?? null
    try {
      await broadcast(`poll:${body.poll_id}`, 'vote:cast', { pollId: body.poll_id, voteId })
    } catch (_error) {
      // broadcast failure is non-fatal — no subscribers yet is normal
    }

    res.status(201).json(vote.data)
  } catch (err) {
    logger.error('votes.cast', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
