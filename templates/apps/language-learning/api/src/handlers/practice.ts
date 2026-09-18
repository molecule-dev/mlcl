/**
 * Speaking-practice handlers.
 *
 * Two endpoints:
 *
 * - `GET  /api/practice/phrases?course_id=…` returns up to 8 phrases for a
 *   user to practise — sourced from real seeded `exercises` rows so any
 *   answer the user submits is checkable. Each phrase row carries the
 *   underlying exercise_id so the client knows what to POST back.
 *
 * - `POST /api/practice/synthesize` — proxy to OpenAI TTS via the
 *   `@molecule/api-ai-speech` bond. Returns the raw audio bytes for the
 *   prompt phrase so the user can hear a native speaker. Cached by the
 *   browser via standard HTTP semantics. Real audio bytes — never a
 *   silent placeholder.
 *
 * - `POST /api/practice/check` — grades a typed answer against the
 *   `correct_answer` of the exercise; persists an `exercise_results` row
 *   (so the dashboard's XP / streak / minutes_today aggregator sees the
 *   activity) and returns `{ correct, xp_earned, correct_answer,
 *   explanation }`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getProvider } from '@molecule/api-ai-speech'
import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import { seedCatalogOnce } from './_seed.js'

const router = Router()

const phrasesQuerySchema = z.object({
  course_id: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const synthSchema = z.object({
  text: z.string().min(1).max(500),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
})

const checkSchema = z.object({
  exercise_id: z.string().min(1),
  answer: z.string().min(1).max(2000),
  time_taken_ms: z
    .number()
    .int()
    .min(0)
    .max(60 * 60 * 1000)
    .optional(),
})

interface ExerciseRow {
  id: string
  lesson_id: string
  type: string
  prompt: string
  choices: string | string[]
  correct_answer: string
  explanation: string
  xp_value: number | string
}

interface LessonRow {
  id: string
  course_id: string
  title: string
  language: string | null
  flag: string | null
  level: string | null
}

router.get(
  '/phrases',
  validateQuery(phrasesQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!getUserId(res)) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    await seedCatalogOnce()
    const q = req.query as z.infer<typeof phrasesQuerySchema>
    const limit = q.limit ?? 8

    // Fetch lessons; if course_id, filter; otherwise pull the first 30 lessons.
    const lessons = (await findMany<LessonRow>('lessons', {
      where: q.course_id ? [{ field: 'course_id', operator: '=', value: q.course_id }] : [],
      limit: 30,
    })) as LessonRow[]
    const lessonsById = new Map(lessons.map((l) => [l.id, l]))
    const lessonIds = lessons.map((l) => l.id)
    if (lessonIds.length === 0) {
      res.json({ phrases: [] })
      return
    }
    const exercises = (await findMany<ExerciseRow>('exercises', {
      where: [{ field: 'lesson_id', operator: 'in', value: lessonIds }],
      limit: 200,
    })) as ExerciseRow[]
    // Pseudo-random shuffle keyed off Math.random — deterministic enough
    // for "give me a fresh-ish set each load" without bringing a seedable
    // RNG in.
    const shuffled = [...exercises].sort(() => Math.random() - 0.5).slice(0, limit)
    const phrases = shuffled.map((ex) => {
      const lesson = lessonsById.get(ex.lesson_id)
      let choices: string[] = []
      if (Array.isArray(ex.choices)) choices = ex.choices as string[]
      else if (typeof ex.choices === 'string') {
        try {
          const parsed = JSON.parse(ex.choices)
          if (Array.isArray(parsed)) choices = parsed as string[]
        } catch (_error) {
          // JSON.parse failed; fall back to empty choices array as a safe default.
          choices = []
        }
      }
      return {
        exercise_id: ex.id,
        type: ex.type,
        prompt: ex.prompt,
        choices,
        // Include `correct_answer` because this is *speaking* practice — the
        // page shows the target phrase, plays TTS of it, and lets the user
        // log a successful repetition. The frontend cannot synthesize or
        // submit the right thing without knowing what the right thing is.
        correct_answer: ex.correct_answer,
        xp_value: Number(ex.xp_value ?? 10),
        lesson_title: lesson?.title ?? '',
        language: lesson?.language ?? '',
        flag: lesson?.flag ?? '',
        level: lesson?.level ?? '',
      }
    })
    res.json({ phrases })
  },
)

router.post(
  '/synthesize',
  validateBody(synthSchema),
  async (req: Request, res: Response): Promise<void> => {
    if (!getUserId(res)) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof synthSchema>
    const provider = getProvider()
    if (!provider?.synthesize) {
      res.status(503).json({
        error: t('practice.error.ttsUnavailable', undefined, {
          defaultValue: 'Speech synthesis provider unavailable.',
        }),
      })
      return
    }
    const result = await provider.synthesize({
      input: body.text,
      voice: body.voice ?? 'nova',
      responseFormat: 'mp3',
      speed: 0.95,
    })
    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.status(200).send(Buffer.from(result.audio))
  },
)

router.post(
  '/check',
  validateBody(checkSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof checkSchema>
    const exercise = await findById<ExerciseRow>('exercises', body.exercise_id)
    if (!exercise) {
      res.status(404).json({
        error: t('exercises.notFound', undefined, { defaultValue: 'Exercise not found.' }),
      })
      return
    }
    const submitted = body.answer.trim().toLowerCase()
    const expected = String(exercise.correct_answer ?? '')
      .trim()
      .toLowerCase()
    const isCorrect = submitted === expected
    const xpEarned = isCorrect ? Number(exercise.xp_value ?? 0) : 0
    await create('exercise_results', {
      exercise_id: body.exercise_id,
      user_id: userId,
      answer: body.answer,
      is_correct: isCorrect,
      xp_earned: xpEarned,
      time_taken_ms: body.time_taken_ms ?? 0,
      completed_at: new Date(),
    })
    res.status(201).json({
      correct: isCorrect,
      xp_earned: xpEarned,
      correct_answer: exercise.correct_answer,
      explanation: exercise.explanation,
    })
  },
)

export default router
