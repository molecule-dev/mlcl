/**
 * Quiz CRUD handlers + AI-generated questions + grading.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import type { ChatEvent } from '@molecule/api-ai'
import {
  getProvider as getAIProvider,
  getProviderByName as getAIProviderByName,
} from '@molecule/api-ai'
import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, deleteMany, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { AiStudyBuddyLimits } from '../tiers.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxQuizzes = enforceLimit<AiStudyBuddyLimits>({
  limitType: 'maxQuizzes',
  getLimit: (limits) => limits.maxQuizzes,
  getCurrent: async (userId) =>
    count('quizzes', [{ field: 'user_id', operator: '=', value: userId }]),
}) as unknown as RequestHandler

const difficultyEnum = z.enum(['easy', 'medium', 'hard'])

const createQuizSchema = z.object({
  topic_id: z.string().min(1),
  title: z.string().min(1).max(200),
  difficulty: difficultyEnum.optional(),
})

const updateQuizSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  difficulty: difficultyEnum.optional(),
})

const listQuerySchema = z.object({
  topic_id: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

const generateSchema = z.object({
  topicId: z.string().min(1),
  questionCount: z.coerce.number().int().min(3).max(20).optional(),
  difficulty: difficultyEnum.optional(),
})

const submitSchema = z.object({
  answers: z.array(z.coerce.number().int()).min(1).max(50),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const q = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (q.topic_id) where.push({ field: 'topic_id', operator: '=', value: q.topic_id })
    const orderBy: OrderBy[] = [{ field: 'created_at', direction: 'desc' }]
    const quizzes = await findMany('quizzes', {
      where,
      orderBy,
      limit: q.limit ?? 100,
      offset: q.offset ?? 0,
    })
    res.json(quizzes)
  },
)

router.get(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const quiz = await findById<Record<string, unknown>>('quizzes', idOf(req))
    if (!quiz || quiz.user_id !== userId) {
      res.status(404).json({
        error: t('quizzes.notFound', undefined, { defaultValue: 'Quiz not found.' }),
      })
      return
    }
    const questions = await findMany('quiz_questions', {
      where: [{ field: 'quiz_id', operator: '=', value: idOf(req) }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })
    res.json({ ...quiz, questions })
  },
)

router.post(
  '/',
  enforceMaxQuizzes,
  validateBody(createQuizSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createQuizSchema>
    const topic = await findById<Record<string, unknown>>('topics', body.topic_id)
    if (!topic || topic.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const result = await create('quizzes', {
      user_id: userId,
      topic_id: body.topic_id,
      title: body.title,
      difficulty: body.difficulty ?? 'medium',
      question_count: 0,
      best_score: null,
      attempt_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateQuizSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('quizzes', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('quizzes.notFound', undefined, { defaultValue: 'Quiz not found.' }),
      })
      return
    }
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    const result = await updateById('quizzes', id, updates)
    res.json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('quizzes', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('quizzes.notFound', undefined, { defaultValue: 'Quiz not found.' }),
      })
      return
    }
    await deleteMany('quiz_questions', [{ field: 'quiz_id', operator: '=', value: id }])
    await deleteMany('quiz_attempts', [
      { field: 'quiz_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    await deleteMany('quizzes', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

router.post(
  '/generate',
  enforceMaxQuizzes,
  validateBody(generateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof generateSchema>
    const topic = await findById<Record<string, unknown>>('topics', body.topicId)
    if (!topic || topic.user_id !== userId) {
      res.status(404).json({
        error: t('topics.notFound', undefined, { defaultValue: 'Topic not found.' }),
      })
      return
    }
    const requested = body.questionCount ?? 5
    const difficulty = body.difficulty ?? 'medium'

    const aiProvider = getAIProvider() ?? getAIProviderByName('anthropic')
    if (!aiProvider) {
      res.status(503).json({
        error: t('quizzes.aiUnavailable', undefined, {
          defaultValue: 'Quiz generation requires ANTHROPIC_API_KEY.',
        }),
      })
      return
    }

    const materials = await findMany<{ title: string; content: string }>('study_materials', {
      where: [
        { field: 'topic_id', operator: '=', value: body.topicId },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 8,
    })
    const reference = materials
      .map((m) => `## ${m.title}\n${(m.content ?? '').slice(0, 2500)}`)
      .join('\n\n')
      .slice(0, 14_000)

    const systemPrompt = `You are a quiz writer. Output ONLY a JSON object with shape {"questions":[{"question":"...","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]}. Use 4 options each. correct_index is 0-based. Difficulty: ${difficulty}. No prose, no markdown fences.`
    const userPrompt = `Topic: ${String(topic.title)}\n${reference ? `\nReference material:\n${reference}\n` : ''}\nGenerate exactly ${requested} multiple-choice questions on this topic at ${difficulty} difficulty. Each question has exactly 4 options. correct_index is the index (0-3) of the correct answer. Include a one-sentence explanation per question. Return ONLY the JSON object.`

    let raw = ''
    try {
      for await (const event of aiProvider.chat({
        messages: [{ role: 'user' as const, content: userPrompt }],
        system: systemPrompt,
        model: 'claude-haiku-4-5-20251001',
        maxTokens: 4000,
      })) {
        const e = event as ChatEvent
        if (e.type === 'text') raw += String((e as { content?: string }).content ?? '')
        if (e.type === 'error') {
          throw new Error(String((e as { message?: string }).message ?? 'AI error'))
        }
        if (e.type === 'done') break
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Quiz generation failed.'
      res.status(502).json({ error: message })
      return
    }

    const stripped = raw
      .replace(/^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/m, '$1')
      .replace(/```(?:json)?/g, '')
      .trim()
    let parsed: {
      questions?: Array<{
        question?: string
        options?: unknown
        correct_index?: number
        explanation?: string
      }>
    } = {}
    try {
      parsed = JSON.parse(stripped) as typeof parsed
    } catch (_error) {
      // JSON.parse failed — the AI returned malformed output; respond with a static error message
      res.status(502).json({
        error: t('quizzes.parseFailed', undefined, {
          defaultValue: 'Quiz generation returned invalid JSON.',
        }),
      })
      return
    }
    const candidates = Array.isArray(parsed.questions) ? parsed.questions : []
    const placeholderQuestions = candidates
      .map((q) => {
        const opts = Array.isArray(q.options) ? (q.options as unknown[]).map(String) : []
        const ci = Number(q.correct_index)
        if (!q.question || opts.length < 2 || !Number.isFinite(ci) || ci < 0 || ci >= opts.length) {
          return null
        }
        return {
          question: String(q.question),
          options: opts,
          correct_index: ci,
          explanation: String(q.explanation ?? ''),
        }
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .slice(0, requested)

    if (placeholderQuestions.length === 0) {
      res.status(502).json({
        error: t('quizzes.noneGenerated', undefined, {
          defaultValue: 'Quiz generation returned no usable questions.',
        }),
      })
      return
    }

    const quizResult = await create('quizzes', {
      user_id: userId,
      topic_id: body.topicId,
      title: t(
        'quizzes.defaultTitle',
        { topic: topic.title as string },
        { defaultValue: `${topic.title as string} Quiz` },
      ),
      difficulty,
      question_count: placeholderQuestions.length,
      best_score: null,
      attempt_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const quizRow = quizResult.data as Record<string, unknown> | null
    if (!quizRow) {
      res.status(500).json({
        error: t('quizzes.createFailed', undefined, {
          defaultValue: 'Could not create quiz.',
        }),
      })
      return
    }
    const quizId = quizRow.id as string

    for (let i = 0; i < placeholderQuestions.length; i++) {
      const q = placeholderQuestions[i]
      await create('quiz_questions', {
        quiz_id: quizId,
        position: i + 1,
        question: q.question,
        options: JSON.stringify(q.options),
        correct_index: q.correct_index,
        explanation: q.explanation,
        created_at: new Date(),
      })
    }

    const questions = await findMany('quiz_questions', {
      where: [{ field: 'quiz_id', operator: '=', value: quizId }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })

    res.status(201).json({ ...quizRow, questions })
  },
)

router.post(
  '/:id/submit',
  validateParams(idParamSchema),
  validateBody(submitSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const quiz = await findById<Record<string, unknown>>('quizzes', id)
    if (!quiz || quiz.user_id !== userId) {
      res.status(404).json({
        error: t('quizzes.notFound', undefined, { defaultValue: 'Quiz not found.' }),
      })
      return
    }
    const { answers } = req.body as z.infer<typeof submitSchema>

    const questions = await findMany<{
      id: string
      question: string
      options: unknown
      correct_index: number
      explanation: string
    }>('quiz_questions', {
      where: [{ field: 'quiz_id', operator: '=', value: id }],
      orderBy: [{ field: 'position', direction: 'asc' }],
    })

    const totalQuestions = questions.length
    if (totalQuestions === 0) {
      res.status(400).json({
        error: t('quizzes.noQuestions', undefined, {
          defaultValue: 'Quiz has no questions.',
        }),
      })
      return
    }

    const results = questions.map((q, index) => {
      const userAnswer = answers[index] ?? -1
      const correct = userAnswer === q.correct_index
      return {
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        user_answer: userAnswer,
        correct,
        explanation: q.explanation,
      }
    })

    const correctCount = results.filter((r) => r.correct).length
    const score = Math.round((correctCount / totalQuestions) * 100)
    const allCorrect = correctCount === totalQuestions

    const feedbackSummary = allCorrect
      ? t('quizzes.perfectScore', undefined, {
          defaultValue: 'Perfect score! You have mastered all the concepts in this quiz.',
        })
      : t(
          'quizzes.tutorFeedback',
          { correct: correctCount, total: totalQuestions },
          {
            defaultValue:
              'Great progress — {{correct}} of {{total}} correct. Review the explanations below to lock in what you missed.',
          },
        )

    await create('quiz_attempts', {
      quiz_id: id,
      user_id: userId,
      score,
      correct_count: correctCount,
      total_count: totalQuestions,
      answers: JSON.stringify(answers),
      created_at: new Date(),
    })

    const previousBest = (quiz.best_score as number | null) ?? null
    const newBest = previousBest === null ? score : Math.max(previousBest, score)
    await updateById('quizzes', id, {
      best_score: newBest,
      attempt_count: ((quiz.attempt_count as number) ?? 0) + 1,
      updated_at: new Date(),
    })

    if (quiz.topic_id) {
      const topicId = quiz.topic_id as string
      const topicAttempts = await findMany<{ score: number }>('quiz_attempts', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'quiz_id', operator: '=', value: id },
        ],
        orderBy: [{ field: 'created_at', direction: 'desc' }],
        limit: 5,
      })
      const recentScores = topicAttempts.map((a) => a.score)
      if (recentScores.length > 0) {
        const avgMastery = Math.round(
          recentScores.reduce((sum, n) => sum + n, 0) / recentScores.length,
        )
        await updateById('topics', topicId, {
          mastery_score: avgMastery,
          last_studied_at: new Date(),
          updated_at: new Date(),
        })
      }
    }

    res.json({
      score,
      correct_count: correctCount,
      total_count: totalQuestions,
      results,
      feedback_summary: feedbackSummary,
    })
  },
)

router.get(
  '/:id/attempts',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const quiz = await findById<Record<string, unknown>>('quizzes', id)
    if (!quiz || quiz.user_id !== userId) {
      res.status(404).json({
        error: t('quizzes.notFound', undefined, { defaultValue: 'Quiz not found.' }),
      })
      return
    }
    const attempts = await findMany('quiz_attempts', {
      where: [
        { field: 'quiz_id', operator: '=', value: id },
        { field: 'user_id', operator: '=', value: userId },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(attempts)
  },
)

export default router
