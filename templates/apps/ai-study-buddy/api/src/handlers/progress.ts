/**
 * Progress page handler — returns weekly minutes, KPIs, and per-subject
 * trends for the authenticated user.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface Topic {
  id: string
  title: string
  subject?: string
  mastery_score?: number
  updated_at?: string
}

interface QuizAttempt {
  user_id: string
  quiz_id: string
  score: number
  created_at: string
}

interface StudySession {
  user_id: string
  topic_id?: string
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

  const now = new Date()
  const oneMonthAgo = new Date(now.getTime() - 30 * DAY_MS)
  const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS)

  const [topics, sessions, attempts] = await Promise.all([
    findMany<Topic>('topics', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 200,
    }),
    findMany<StudySession>('study_sessions', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'created_at', operator: '>=', value: oneMonthAgo },
      ],
      limit: 5000,
    }),
    findMany<QuizAttempt>('quiz_attempts', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'created_at', operator: '>=', value: oneMonthAgo },
      ],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1000,
    }),
  ])

  const toDayKey = (value: string | Date | null | undefined): string => {
    if (!value) return ''
    const d = value instanceof Date ? value : new Date(value)
    if (Number.isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  }

  const weekly: Array<{ day: string; minutes: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * DAY_MS)
    const dayLabel = DAY_LABELS[d.getDay()]
    const dayKey = d.toISOString().slice(0, 10)
    const cards = sessions
      .filter((s) => toDayKey(s.created_at) === dayKey)
      .reduce((acc, s) => acc + Number(s.cards_reviewed ?? 0), 0)
    const ai = sessions
      .filter((s) => toDayKey(s.created_at) === dayKey)
      .reduce((acc, s) => acc + Number(s.ai_messages_count ?? 0), 0)
    const dayAttempts = attempts.filter((a) => toDayKey(a.created_at) === dayKey).length
    weekly.push({
      day: dayLabel,
      minutes: Math.round(cards * 0.5 + ai * 1.5 + dayAttempts * 5),
    })
  }

  // KPIs.
  const totalMinutes = weekly.reduce((s, d) => s + d.minutes, 0)
  const avgMastery = topics.length
    ? Math.round(topics.reduce((s, t) => s + Number(t.mastery_score ?? 0), 0) / topics.length)
    : 0
  const recallRate = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + Number(a.score ?? 0), 0) / attempts.length)
    : 0

  // Streak (current run).
  const dayKey = (d: Date): string => d.toISOString().slice(0, 10)
  const activeDays = new Set<string>()
  for (const s of sessions) activeDays.add(dayKey(new Date(s.created_at)))
  for (const a of attempts) activeDays.add(dayKey(new Date(a.created_at)))
  let streakDays = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getTime() - i * DAY_MS)
    if (activeDays.has(dayKey(d))) streakDays++
    else if (i > 0) break
  }

  // Subject trends (per topic, recent 30d mastery vs prior).
  const subjectTrends = topics.slice(0, 8).map((t) => {
    const recentSessions = sessions.filter(
      (s) => s.topic_id === t.id && new Date(s.created_at) >= sevenDaysAgo,
    )
    const recentDelta = recentSessions.length === 0 ? 0 : Math.min(20, recentSessions.length)
    return {
      id: t.id,
      name: t.title,
      mastery: Number(t.mastery_score ?? 0),
      delta: recentDelta,
      tone: recentDelta >= 0 ? 'success' : 'warning',
    }
  })

  res.json({
    weekly,
    kpis: {
      week_minutes: totalMinutes,
      avg_mastery: avgMastery,
      recall_rate: recallRate,
      streak_days: streakDays,
    },
    overall_mastery: avgMastery,
    subject_trends: subjectTrends,
  })
})

export default router
