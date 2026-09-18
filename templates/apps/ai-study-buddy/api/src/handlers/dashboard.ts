/**
 * Dashboard aggregate handler — returns a single payload with the
 * stats, mastery summary, recommended topics, review queue, and
 * timeline that the dashboard page renders.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const DAY_MS = 24 * 60 * 60 * 1000

interface QuizAttempt {
  quiz_id: string
  score: number
  created_at: string
}

interface Topic {
  id: string
  title: string
  description?: string
  subject?: string
  color?: string
  mastery_score?: number
  material_count?: number
  last_studied_at?: string | null
  updated_at?: string
}

interface FlashcardDeck {
  id: string
  name: string
  card_count?: number
  topic_id?: string | null
  last_reviewed_at?: string | null
}

interface Flashcard {
  id: string
  deck_id: string
  due_at: string
  ease_factor: number
}

interface StudySession {
  id: string
  topic_id?: string
  session_type?: string
  cards_reviewed?: number
  ai_messages_count?: number
  created_at: string
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const [topics, decks, flashcards, attempts, sessions] = await Promise.all([
    findMany<Topic>('topics', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 200,
    }),
    findMany<FlashcardDeck>('flashcard_decks', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'updated_at', direction: 'desc' }],
      limit: 200,
    }),
    findMany<Flashcard>('flashcards', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 5000,
    }),
    findMany<QuizAttempt>('quiz_attempts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    }),
    findMany<StudySession>('study_sessions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    }),
  ])

  // KPIs
  const totalCards = flashcards.length
  const cardsMastered = flashcards.filter((c) => Number(c.ease_factor ?? 0) >= 2.5).length

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * DAY_MS)
  const recentSessions = sessions.filter((s) => new Date(s.created_at) >= oneWeekAgo)
  const recentAttempts = attempts.filter((a) => new Date(a.created_at) >= oneWeekAgo)

  const cardsReviewedThisWeek = recentSessions.reduce(
    (acc, s) => acc + Number(s.cards_reviewed ?? 0),
    0,
  )
  const aiMessagesThisWeek = recentSessions.reduce(
    (acc, s) => acc + Number(s.ai_messages_count ?? 0),
    0,
  )
  const hoursThisWeek = Number(
    (
      (cardsReviewedThisWeek * 0.5 + aiMessagesThisWeek * 1.5 + recentAttempts.length * 5) /
      60
    ).toFixed(1),
  )

  const avgQuizScore = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + Number(a.score ?? 0), 0) / attempts.length)
    : 0

  // Streak: count consecutive days going back from today with at least one
  // session/attempt.
  const dayKey = (d: Date): string => d.toISOString().slice(0, 10)
  const activeDays = new Set<string>()
  for (const s of sessions) activeDays.add(dayKey(new Date(s.created_at)))
  for (const a of attempts) activeDays.add(dayKey(new Date(a.created_at)))
  let streakDays = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getTime() - i * DAY_MS)
    if (activeDays.has(dayKey(d))) {
      streakDays++
    } else if (i > 0) {
      // gap after at least one active day breaks the streak
      break
    } else {
      // not active today — keep checking yesterday for current streak
      continue
    }
  }

  // Mastery segments: for each card classify bucket.
  let mastered = 0
  let reviewing = 0
  let learning = 0
  let notStarted = 0
  for (const c of flashcards) {
    const ef = Number(c.ease_factor ?? 0)
    if (ef >= 2.5) mastered++
    else if (ef >= 2.0) reviewing++
    else if (ef > 0) learning++
    else notStarted++
  }
  if (totalCards === 0) {
    notStarted = 0
  }

  // 7-day study history.
  const history: Array<{ date: string; hours: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS)
    const key = dayKey(d)
    const cards = sessions
      .filter((s) => dayKey(new Date(s.created_at)) === key)
      .reduce((acc, s) => acc + Number(s.cards_reviewed ?? 0), 0)
    const aiMsgs = sessions
      .filter((s) => dayKey(new Date(s.created_at)) === key)
      .reduce((acc, s) => acc + Number(s.ai_messages_count ?? 0), 0)
    const dayAttempts = attempts.filter((a) => dayKey(new Date(a.created_at)) === key).length
    history.push({
      date: key,
      hours: Number(((cards * 0.5 + aiMsgs * 1.5 + dayAttempts * 5) / 60).toFixed(1)),
    })
  }

  // Recommended topics: lowest mastery first, top 4 by recent activity.
  const recommended = [...topics]
    .sort((a, b) => Number(a.mastery_score ?? 0) - Number(b.mastery_score ?? 0))
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.description ?? '',
      mastery_pct: Number(t.mastery_score ?? 0),
      material_count: Number(t.material_count ?? 0),
      subject: t.subject ?? 'general',
      color: t.color ?? 'teal',
      to: `/courses/${t.id}`,
    }))

  // Review queue: decks ordered by due_count desc.
  const queue = await Promise.all(
    decks.slice(0, 12).map(async (deck) => {
      const due = await count('flashcards', [
        { field: 'deck_id', operator: '=', value: deck.id },
        { field: 'due_at', operator: '<=', value: now },
      ])
      return {
        id: deck.id,
        title: deck.name,
        card_count: Number(deck.card_count ?? 0),
        due_count: due,
        last_reviewed_at: deck.last_reviewed_at ?? null,
      }
    }),
  )
  queue.sort((a, b) => b.due_count - a.due_count)

  // Timeline: last 4 sessions.
  const timeline = sessions.slice(0, 4).map((s) => {
    const topic = topics.find((tt) => tt.id === s.topic_id)
    return {
      id: s.id,
      created_at: s.created_at,
      topic_title: topic?.title ?? 'Study session',
      cards_reviewed: Number(s.cards_reviewed ?? 0),
      ai_messages_count: Number(s.ai_messages_count ?? 0),
      session_type: s.session_type ?? 'qa',
    }
  })

  res.json({
    stats: {
      streak_days: streakDays,
      hours_this_week: hoursThisWeek,
      cards_mastered: cardsMastered,
      avg_quiz_score: avgQuizScore,
    },
    mastery: {
      cards_mastered: mastered,
      cards_total: totalCards,
      history,
      segments: { mastered, reviewing, learning, not_started: notStarted },
    },
    recommended,
    review_queue: queue.slice(0, 6),
    timeline,
  })
})

export default router
