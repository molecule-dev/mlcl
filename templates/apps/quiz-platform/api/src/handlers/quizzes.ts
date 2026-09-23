import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'
import { index as indexDocument, search as searchIndex } from '@molecule/api-search'

const router = Router()

const createQuizSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  cover_url: z.string().url().optional(),
  time_per_question_s: z.number().int().min(5).max(300).optional(),
  scoring_mode: z.enum(['speed', 'flat']).optional(),
})

const updateQuizSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  cover_url: z.string().url().optional(),
  time_per_question_s: z.number().int().min(5).max(300).optional(),
  scoring_mode: z.enum(['speed', 'flat']).optional(),
})

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    const { search, category, creator_id, mine } = req.query

    if (search) {
      const results = await searchIndex('quizzes', { text: String(search) })
      return res.json(results)
    }

    const where: WhereCondition[] = []
    if (mine === 'true' || mine === '1') {
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      where.push({ field: 'creator_id', operator: '=', value: userId })
    } else {
      where.push({ field: 'status', operator: '=', value: 'published' })
    }
    if (category) where.push({ field: 'category', operator: '=', value: String(category) })
    if (creator_id) where.push({ field: 'creator_id', operator: '=', value: String(creator_id) })

    const quizzes = await findMany('quizzes', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    return res.json(quizzes)
  } catch (error) {
    logger.error('quizzes.list', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const quiz = await findById<Record<string, unknown>>('quizzes', id)
    if (!quiz) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }
    if (quiz.status !== 'published') {
      const userId = getUserId(res)
      if (!userId || quiz.creator_id !== userId) {
        return res
          .status(404)
          .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
      }
    }
    return res.json(quiz)
  } catch (error) {
    logger.error('quizzes.get', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createQuizSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const result = await create<Record<string, unknown>>('quizzes', {
      ...req.body,
      creator_id: userId,
      status: 'draft',
      play_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    if (result.data) {
      try {
        await indexDocument('quizzes', String(result.data.id), result.data)
      } catch (err) {
        /* search optional in test */ void err
      }
    }
    return res.status(201).json(result.data)
  } catch (error) {
    logger.error('quizzes.create', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateQuizSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('quizzes', id)
    if (!existing || existing.creator_id !== userId) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }

    const result = await updateById<Record<string, unknown>>('quizzes', id, {
      ...req.body,
      updated_at: new Date(),
    })
    if (result.data) {
      try {
        await indexDocument('quizzes', String(result.data.id), result.data)
      } catch (err) {
        void err
      }
    }
    return res.json(result.data)
  } catch (error) {
    logger.error('quizzes.update', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('quizzes', id)
    if (!existing || existing.creator_id !== userId) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }

    await deleteById('quizzes', id)
    return res.status(204).end()
  } catch (error) {
    logger.error('quizzes.delete', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('quizzes', id)
    if (!existing || existing.creator_id !== userId) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }

    // Publish-time invariants: at least one question and every question
    // must have a non-empty correct_answer + at least 2 valid choices.
    const questions = await findMany<Record<string, unknown>>('questions', {
      where: [{ field: 'quiz_id', operator: '=', value: id }],
    })
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: t(
          'quizzes.publishEmpty',
          {},
          { defaultValue: 'Add at least one question before publishing.' },
        ),
      })
    }
    for (const q of questions) {
      const correct = String(q.correct_answer ?? '')
      let choices: unknown = q.choices
      if (typeof choices === 'string') {
        try {
          choices = JSON.parse(choices)
        } catch (_error) {
          // Invalid JSON stored in choices column; treat as empty
          choices = []
        }
      }
      const choiceList = Array.isArray(choices)
        ? choices.map(String).filter((c) => c.trim() !== '')
        : []
      if (correct.trim() === '' || choiceList.length < 2 || !choiceList.includes(correct)) {
        return res.status(400).json({
          error: t(
            'quizzes.publishIncomplete',
            {},
            {
              defaultValue:
                'Every question needs at least two answer choices and a marked correct answer.',
            },
          ),
        })
      }
    }

    const result = await updateById<Record<string, unknown>>('quizzes', id, {
      status: 'published',
      published_at: new Date(),
      updated_at: new Date(),
    })
    if (result.data) {
      try {
        await indexDocument('quizzes', String(result.data.id), result.data)
      } catch (err) {
        void err
      }
    }
    return res.json(result.data)
  } catch (error) {
    logger.error('quizzes.publish', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const original = await findById<Record<string, unknown>>('quizzes', id)
    if (!original || original.creator_id !== userId) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }
    const questions = await findMany<Record<string, unknown>>('questions', {
      where: [{ field: 'quiz_id', operator: '=', value: id }],
    })

    const copyResult = await create('quizzes', {
      creator_id: userId,
      title: `${original.title} (${t('quizzes.copy', {}, { defaultValue: 'Copy' })})`,
      description: original.description,
      category: original.category,
      cover_url: original.cover_url,
      time_per_question_s: original.time_per_question_s ?? 20,
      scoring_mode: original.scoring_mode ?? 'speed',
      status: 'draft',
      play_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })

    const copy = copyResult.data as Record<string, unknown> | null
    if (copy) {
      for (const q of questions) {
        await create('questions', {
          quiz_id: copy.id,
          position: q.position,
          type: q.type,
          prompt: q.prompt,
          // Re-serialise the JS array (already JSON-decoded by pg) for the
          // JSONB column on insert.
          choices: JSON.stringify(q.choices ?? []),
          correct_answer: q.correct_answer,
          points: q.points,
          time_limit_s: q.time_limit_s,
          image_url: q.image_url,
          explanation: q.explanation,
          created_at: new Date(),
          updated_at: new Date(),
        })
      }
    }
    return res.status(201).json(copy)
  } catch (error) {
    logger.error('quizzes.duplicate', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
