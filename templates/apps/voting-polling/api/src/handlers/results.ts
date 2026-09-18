import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateQuery } from '@molecule/api-middleware-validation'
import { aggregate, timeSeries } from '@molecule/api-reporting'

const router = Router()

const getPollId = (req: Request): string => {
  const id = req.params.pollId
  return Array.isArray(id) ? id[0] : id
}

const timelineQuerySchema = z.object({
  interval: z.enum(['hour', 'day', 'week', 'month', 'year']).default('hour'),
})

/**
 * Loads a poll the requesting user is allowed to read aggregate results for.
 *
 * For now this returns the poll iff the requesting user is the owner. A
 * future iteration that adds workspace-share / share_token reads should
 * extend this guard rather than removing the ownership check from the
 * route handlers.
 */
async function authorizePollRead(
  pollId: string,
  userId: string | null,
): Promise<Record<string, unknown> | null> {
  if (!userId) return null
  const poll = await findById<Record<string, unknown>>('polls', pollId)
  if (!poll) return null
  if (poll.user_id !== userId) return null
  return poll
}

router.get('/:pollId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const pollId = getPollId(req)
    const poll = await authorizePollRead(pollId, userId)
    if (!poll) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }

    const where: WhereCondition[] = [{ field: 'poll_id', operator: '=', value: pollId }]
    const votes = await findMany<Record<string, unknown>>('votes', { where })

    const pollType = String(poll.type)
    const options = (Array.isArray(poll.options) ? poll.options : []) as string[]
    let tallies: Record<string, unknown>

    if (pollType === 'single-choice') {
      const counts = new Array(options.length).fill(0) as number[]
      for (const v of votes) {
        const idx = Number(v.option_index)
        if (idx >= 0 && idx < counts.length) counts[idx]++
      }
      tallies = {
        options: options.map((label, i) => ({ label, count: counts[i] })),
        total_votes: votes.length,
      }
    } else if (pollType === 'multiple-choice') {
      const counts = new Array(options.length).fill(0) as number[]
      for (const v of votes) {
        const selected = v.selected_options as number[] | null
        if (Array.isArray(selected)) {
          for (const idx of selected) if (idx >= 0 && idx < counts.length) counts[idx]++
        }
      }
      tallies = {
        options: options.map((label, i) => ({ label, count: counts[i] })),
        total_votes: votes.length,
      }
    } else if (pollType === 'ranked') {
      const scores = new Array(options.length).fill(0) as number[]
      for (const v of votes) {
        const ranked = v.ranked_choices as number[] | null
        if (Array.isArray(ranked)) {
          for (let rank = 0; rank < ranked.length; rank++) {
            const idx = ranked[rank]
            if (idx >= 0 && idx < scores.length) scores[idx] += options.length - rank
          }
        }
      }
      tallies = {
        options: options.map((label, i) => ({ label, score: scores[i] })),
        total_votes: votes.length,
      }
    } else {
      tallies = {
        responses: votes.map((v) => ({ text: v.open_text, created_at: v.created_at })),
        total_votes: votes.length,
      }
    }

    res.json({ poll_id: pollId, type: pollType, ...tallies })
  } catch (err) {
    logger.error('results.get', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get(
  '/:pollId/timeline',
  validateQuery(timelineQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
        return
      }
      const pollId = getPollId(req)
      const poll = await authorizePollRead(pollId, userId)
      if (!poll) {
        res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
        return
      }
      const { interval } = req.query as unknown as z.infer<typeof timelineQuerySchema>
      const timeline = await timeSeries({
        table: 'votes',
        dateField: 'created_at',
        interval,
        filters: [{ field: 'poll_id', operator: 'eq', value: pollId }],
        measures: [{ field: '*', function: 'count', alias: 'vote_count' }],
      })
      res.json(timeline)
    } catch (err) {
      logger.error('results.timeline', err)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.get('/:pollId/export', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const pollId = getPollId(req)
    const poll = await authorizePollRead(pollId, userId)
    if (!poll) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'poll_id', operator: '=', value: pollId }]
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'asc' }]
    const votes = await findMany<Record<string, unknown>>('votes', { where, orderBy })

    const exportData = {
      poll: {
        id: poll.id,
        title: poll.title,
        type: poll.type,
        options: poll.options,
        status: poll.status,
        start_date: poll.start_date,
        end_date: poll.end_date,
      },
      total_votes: votes.length,
      votes: votes.map((v) => ({
        option_index: v.option_index,
        selected_options: v.selected_options,
        ranked_choices: v.ranked_choices,
        open_text: v.open_text,
        created_at: v.created_at,
      })),
      exported_at: new Date().toISOString(),
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="poll-${pollId}-results.json"`)
    res.json(exportData)
  } catch (err) {
    logger.error('results.export', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:pollId/analytics', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const pollId = getPollId(req)
    const poll = await authorizePollRead(pollId, userId)
    if (!poll) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    const [votesByTime, totalAgg] = await Promise.all([
      timeSeries({
        table: 'votes',
        dateField: 'created_at',
        interval: 'day',
        filters: [{ field: 'poll_id', operator: 'eq', value: pollId }],
        measures: [{ field: '*', function: 'count', alias: 'vote_count' }],
      }),
      aggregate({
        table: 'votes',
        filters: [{ field: 'poll_id', operator: 'eq', value: pollId }],
        measures: [{ field: '*', function: 'count', alias: 'total' }],
      }),
    ])

    res.json({
      poll_id: pollId,
      total_votes: totalAgg.rows?.[0]?.total ?? 0,
      votes_by_day: votesByTime,
      poll_duration_hours:
        poll.start_date && poll.end_date
          ? Math.round(
              (new Date(String(poll.end_date)).getTime() -
                new Date(String(poll.start_date)).getTime()) /
                3600000,
            )
          : null,
    })
  } catch (err) {
    logger.error('results.analytics', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
