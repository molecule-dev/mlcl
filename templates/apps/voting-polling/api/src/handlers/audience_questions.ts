/**
 * Audience Q&A handler — questions and per-question upvotes.
 *
 * Backed by `audience_questions` + `audience_question_votes` (migration
 * 0010). Reading is poll-owner-scoped (the poll owner sees questions for
 * their poll); writing (asking a question, voting) is open to any
 * authenticated user since audience questions naturally come from
 * non-owners during a live session.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { broadcast } from '@molecule/api-realtime'

const router = Router()

const askSchema = z.object({
  poll_id: z.string().uuid(),
  body: z.string().trim().min(1).max(1000),
  asker_initial: z.string().trim().min(1).max(2).optional(),
})

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'promoted', 'answered', 'hidden']),
})

router.get('/poll/:pollId', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const pollId = getParamId(req, 'pollId')
    const poll = await findById<Record<string, unknown>>('polls', pollId)
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    const where: WhereCondition[] = [{ field: 'poll_id', operator: '=', value: pollId }]
    const orderBy: OrderBy[] = [
      { field: 'status', direction: 'asc' },
      { field: 'asked_at', direction: 'desc' },
    ]
    const items = await findMany<Record<string, unknown>>('audience_questions', {
      where,
      orderBy,
      limit: 200,
    })
    // Decorate with vote counts in a single query
    if (items.length > 0) {
      const ids = items.map((q) => String(q.id))
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ')
      const result = await query<{ question_id: string; total: string }>(
        `SELECT question_id, COUNT(*)::text AS total
         FROM public.audience_question_votes
         WHERE question_id IN (${placeholders})
         GROUP BY question_id`,
        ids,
      )
      const counts = new Map(result.rows.map((r) => [r.question_id, Number(r.total)]))
      for (const q of items) {
        ;(q as Record<string, unknown>).vote_count = counts.get(String(q.id)) ?? 0
      }
    }
    res.json(items)
  } catch (err) {
    logger.error('questions.list', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/', validateBody(askSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const body = req.body as z.infer<typeof askSchema>
    const poll = await findById<Record<string, unknown>>('polls', body.poll_id)
    if (!poll) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    const initial = body.asker_initial ?? 'A'
    const result = await create<Record<string, unknown>>('audience_questions', {
      poll_id: body.poll_id,
      user_id: userId,
      asker_initial: initial,
      body: body.body,
      status: 'pending',
      asked_at: new Date(),
      created_at: new Date(),
    })
    try {
      await broadcast(`poll:${body.poll_id}`, 'question:asked', {
        pollId: body.poll_id,
        question: result.data,
      })
    } catch (_error) {
      // broadcast failure is non-fatal — no subscribers yet is normal
    }
    res.status(201).json(result.data)
  } catch (err) {
    logger.error('questions.create', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/:id/vote', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const q = await findById<Record<string, unknown>>('audience_questions', id)
    if (!q) {
      res
        .status(404)
        .json({ error: t('audience.notFound', {}, { defaultValue: 'Question not found' }) })
      return
    }
    try {
      await create('audience_question_votes', {
        question_id: id,
        user_id: userId,
        voter_id: null,
        created_at: new Date(),
      })
    } catch (_error) {
      // duplicate-vote unique-index violation is not an error to the
      // user; the upvote already exists
    }
    const result = await query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.audience_question_votes WHERE question_id = $1`,
      [id],
    )
    const total = Number(result.rows[0]?.total ?? 0)
    // Broadcast the new tally so every live viewer's count updates — otherwise only the voter
    // (in their own response) sees it change, and popular questions never rise in real time.
    try {
      await broadcast(`poll:${String(q.poll_id)}`, 'question:voted', {
        questionId: id,
        voteCount: total,
      })
    } catch (_error) {
      // broadcast failure is non-fatal — no subscribers yet is normal
    }
    res.json({ question_id: id, vote_count: total })
  } catch (err) {
    logger.error('questions.upvote', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/:id/status', validateBody(updateStatusSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const id = getParamId(req)
    const q = await findById<Record<string, unknown>>('audience_questions', id)
    if (!q) {
      res
        .status(404)
        .json({ error: t('audience.notFound', {}, { defaultValue: 'Question not found' }) })
      return
    }
    const poll = await findById<Record<string, unknown>>('polls', String(q.poll_id))
    if (!poll || poll.user_id !== userId) {
      res.status(404).json({ error: t('polls.notFound', {}, { defaultValue: 'Poll not found' }) })
      return
    }
    const body = req.body as z.infer<typeof updateStatusSchema>
    const result = await updateById('audience_questions', id, { status: body.status })
    try {
      await broadcast(`poll:${poll.id}`, 'question:status', { questionId: id, status: body.status })
    } catch (_error) {
      // broadcast failure is non-fatal — no subscribers yet is normal
    }
    res.json(result.data)
  } catch (err) {
    logger.error('questions.status', err)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
