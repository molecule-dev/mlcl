import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

async function assertOwnsQuiz(quizId: string, userId: string): Promise<boolean> {
  const quiz = await findById<Record<string, unknown>>('quizzes', quizId)
  return Boolean(quiz && quiz.creator_id === userId)
}

/**
 * The answer key (`correct_answer`) and `explanation` must never reach a
 * caller who is not the quiz's creator — otherwise any participant can read
 * the right answers straight off the questions endpoint before/while playing.
 * Scoring stays server-side (sessions.ts `/answer`), so the play UI only ever
 * needs the prompt + choices, never the key.
 */
function sanitizeQuestion(question: Record<string, unknown>): Record<string, unknown> {
  const { correct_answer: _correctAnswer, explanation: _explanation, ...safe } = question
  return safe
}

const createQuestionSchema = z.object({
  quiz_id: z.string().min(1),
  prompt: z.string().min(1),
  type: z.enum(['multiple-choice', 'true-false', 'type-answer']).optional(),
  choices: z.array(z.string()).optional(),
  // Empty string is allowed at create-time so the UI can scaffold a draft
  // question and let the user fill in the correct answer afterwards. The
  // /publish endpoint enforces non-empty answers + complete choices.
  correct_answer: z.string(),
  points: z.number().int().min(0).optional(),
  time_limit_s: z.number().int().min(5).max(300).optional(),
  image_url: z.string().url().optional(),
  explanation: z.string().optional(),
  position: z.number().int().min(0).optional(),
})

const updateQuestionSchema = z.object({
  prompt: z.string().min(1).optional(),
  type: z.enum(['multiple-choice', 'true-false', 'type-answer']).optional(),
  choices: z.array(z.string()).optional(),
  // Empty string is allowed mid-edit; /publish gates the final invariant.
  correct_answer: z.string().optional(),
  points: z.number().int().min(0).optional(),
  time_limit_s: z.number().int().min(5).max(300).optional(),
  image_url: z.string().url().optional(),
  explanation: z.string().optional(),
  position: z.number().int().min(0).optional(),
})

const reorderSchema = z.object({
  question_ids: z.array(z.string().min(1)),
})

router.get('/quiz/:quizId', async (req: Request, res: Response) => {
  try {
    const quizId = getParamId(req, 'quizId')
    // Authorize against the parent quiz: drafts are creator-only, and the
    // answer key is stripped for everyone who is not the creator. Return 404
    // (not 403) on an inaccessible draft so its existence isn't probeable —
    // mirrors quizzes.ts GET /:id.
    const quiz = await findById<Record<string, unknown>>('quizzes', quizId)
    if (!quiz) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }
    const userId = getUserId(res)
    const isOwner = Boolean(userId && quiz.creator_id === userId)
    if (quiz.status !== 'published' && !isOwner) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }

    const questions = await findMany<Record<string, unknown>>('questions', {
      where: [{ field: 'quiz_id', operator: '=', value: quizId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    return res.json(isOwner ? questions : questions.map(sanitizeQuestion))
  } catch (error) {
    logger.error('questions.list', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = getParamId(req)
    const question = await findById<Record<string, unknown>>('questions', id)
    if (!question) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }
    // Authorize via the question's parent quiz: a draft's questions are
    // creator-only and the answer key is stripped for non-creators. 404 on an
    // inaccessible draft so neither the quiz nor the question is probeable.
    const quiz = await findById<Record<string, unknown>>('quizzes', String(question.quiz_id))
    if (!quiz) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }
    const userId = getUserId(res)
    const isOwner = Boolean(userId && quiz.creator_id === userId)
    if (quiz.status !== 'published' && !isOwner) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }
    return res.json(isOwner ? question : sanitizeQuestion(question))
  } catch (error) {
    logger.error('questions.get', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post('/', validateBody(createQuestionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    if (!(await assertOwnsQuiz(req.body.quiz_id, userId))) {
      return res
        .status(404)
        .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
    }

    const result = await create('questions', {
      quiz_id: req.body.quiz_id,
      prompt: req.body.prompt,
      type: req.body.type ?? 'multiple-choice',
      // pg driver serialises JS arrays as Postgres array literals, which the
      // JSONB column rejects. Stringify so it lands as valid JSON.
      choices: JSON.stringify(req.body.choices ?? []),
      correct_answer: req.body.correct_answer,
      points: req.body.points ?? 1000,
      time_limit_s: req.body.time_limit_s ?? 20,
      image_url: req.body.image_url,
      explanation: req.body.explanation,
      position: req.body.position ?? 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    return res.status(201).json(result.data)
  } catch (error) {
    logger.error('questions.create', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/:id', validateBody(updateQuestionSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('questions', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }
    if (!(await assertOwnsQuiz(String(existing.quiz_id), userId))) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }

    const updates: Record<string, unknown> = { ...req.body, updated_at: new Date() }
    if ('choices' in updates && Array.isArray(updates.choices)) {
      updates.choices = JSON.stringify(updates.choices)
    }
    const result = await updateById('questions', id, updates)
    return res.json(result.data)
  } catch (error) {
    logger.error('questions.update', error)
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
    const existing = await findById<Record<string, unknown>>('questions', id)
    if (!existing) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }
    if (!(await assertOwnsQuiz(String(existing.quiz_id), userId))) {
      return res
        .status(404)
        .json({ error: t('questions.notFound', {}, { defaultValue: 'Question not found' }) })
    }

    await deleteById('questions', id)
    return res.status(204).end()
  } catch (error) {
    logger.error('questions.delete', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put(
  '/quiz/:quizId/reorder',
  validateBody(reorderSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      const quizId = getParamId(req, 'quizId')
      if (!(await assertOwnsQuiz(quizId, userId))) {
        return res
          .status(404)
          .json({ error: t('quizzes.notFound', {}, { defaultValue: 'Quiz not found' }) })
      }

      const { question_ids } = req.body as { question_ids: string[] }
      // Bind every child id to the authorized quiz before mutating — assertOwnsQuiz
      // only authorizes the PATH quiz, so without this an owner of quiz A could
      // renumber another quiz's questions by passing their ids. Only reorder ids that
      // actually belong to this quiz; ignore foreign/unknown ids. [RVALL-1 IDOR]
      const owned = await findMany<{ id: string }>('questions', {
        where: [{ field: 'quiz_id', operator: '=', value: quizId }],
      })
      const validIds = new Set(owned.map((q) => String(q.id)))
      for (let i = 0; i < question_ids.length; i++) {
        if (!validIds.has(String(question_ids[i]))) continue
        await updateById('questions', question_ids[i], { position: i, updated_at: new Date() })
      }
      return res.json({ success: true })
    } catch (error) {
      logger.error('questions.reorder', error)
      return res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

export default router
