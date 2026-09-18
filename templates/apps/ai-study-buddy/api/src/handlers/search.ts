/**
 * Search handler — searches across topics, study materials, decks, and
 * quizzes for the authenticated user using a single shared query string.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

const querySchema = z.object({
  q: z.string().max(200).optional(),
  type: z.enum(['all', 'course', 'flashcard', 'note', 'quiz']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

interface TopicRow {
  id: string
  title: string
  description?: string
  subject?: string
}
interface MaterialRow {
  id: string
  topic_id: string
  title: string
  content?: string
}
interface DeckRow {
  id: string
  name: string
  description?: string
}
interface QuizRow {
  id: string
  title: string
  difficulty?: string
}

router.get('/', validateQuery(querySchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const { q, type, limit } = req.query as z.infer<typeof querySchema>
  const cap = limit ?? 20
  const text = (q ?? '').trim()

  const includeType = (k: string): boolean => !type || type === 'all' || type === k

  const [topics, materials, decks, quizzes] = await Promise.all([
    includeType('course')
      ? findMany<TopicRow>('topics', {
          where: text
            ? [
                { field: 'user_id', operator: '=', value: userId },
                { field: 'title', operator: 'ilike', value: text },
              ]
            : [{ field: 'user_id', operator: '=', value: userId }],
          orderBy: [{ field: 'updated_at', direction: 'desc' }],
          limit: cap,
        })
      : Promise.resolve([]),
    includeType('note')
      ? findMany<MaterialRow>('study_materials', {
          where: text
            ? [
                { field: 'user_id', operator: '=', value: userId },
                { field: 'title', operator: 'ilike', value: text },
              ]
            : [{ field: 'user_id', operator: '=', value: userId }],
          orderBy: [{ field: 'updated_at', direction: 'desc' }],
          limit: cap,
        })
      : Promise.resolve([]),
    includeType('flashcard')
      ? findMany<DeckRow>('flashcard_decks', {
          where: text
            ? [
                { field: 'user_id', operator: '=', value: userId },
                { field: 'name', operator: 'ilike', value: text },
              ]
            : [{ field: 'user_id', operator: '=', value: userId }],
          orderBy: [{ field: 'updated_at', direction: 'desc' }],
          limit: cap,
        })
      : Promise.resolve([]),
    includeType('quiz')
      ? findMany<QuizRow>('quizzes', {
          where: text
            ? [
                { field: 'user_id', operator: '=', value: userId },
                { field: 'title', operator: 'ilike', value: text },
              ]
            : [{ field: 'user_id', operator: '=', value: userId }],
          orderBy: [{ field: 'updated_at', direction: 'desc' }],
          limit: cap,
        })
      : Promise.resolve([]),
  ])

  const results: Array<{
    id: string
    title: string
    type: 'course' | 'flashcard' | 'note' | 'quiz'
    subject: string
    snippet: string
    to: string
  }> = []

  for (const topic of topics as TopicRow[]) {
    results.push({
      id: `topic:${topic.id}`,
      title: topic.title,
      type: 'course',
      subject: topic.subject ?? 'general',
      snippet: topic.description ?? '',
      to: `/courses/${topic.id}`,
    })
  }
  for (const m of materials as MaterialRow[]) {
    results.push({
      id: `material:${m.id}`,
      title: m.title,
      type: 'note',
      subject: 'study material',
      snippet: (m.content ?? '').slice(0, 200),
      to: `/courses/${m.topic_id}`,
    })
  }
  for (const deck of decks as DeckRow[]) {
    results.push({
      id: `deck:${deck.id}`,
      title: deck.name,
      type: 'flashcard',
      subject: 'flashcards',
      snippet: deck.description ?? '',
      to: `/flashcards/${deck.id}`,
    })
  }
  for (const quiz of quizzes as QuizRow[]) {
    results.push({
      id: `quiz:${quiz.id}`,
      title: quiz.title,
      type: 'quiz',
      subject: 'practice quiz',
      snippet: quiz.difficulty ? `Difficulty: ${quiz.difficulty}` : '',
      to: `/quiz/${quiz.id}`,
    })
  }

  res.json({ data: results.slice(0, cap), total: results.length })
})

export default router
