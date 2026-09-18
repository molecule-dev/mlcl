/**
 * Profile + achievements handler — returns the user's profile summary
 * (name, member-since, KPIs) and a list of achievements derived from
 * actual study activity.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findById, findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

const DAY_MS = 24 * 60 * 60 * 1000

interface UserRow {
  id: string
  name?: string
  email?: string
  createdAt: string
}

interface QuizAttempt {
  user_id: string
  score: number
  created_at: string
}

interface StudySession {
  user_id: string
  cards_reviewed?: number
  created_at: string
}

const initials = (name: string | undefined | null, email: string | undefined | null): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    return parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('')
  }
  if (email) return email[0]?.toUpperCase() ?? '?'
  return '?'
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }

  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('profile.notFound', undefined, { defaultValue: 'Profile not found.' }) })
    return
  }

  const [topicCount, deckCount, quizAttempts, sessions] = await Promise.all([
    count('topics', [{ field: 'user_id', operator: '=', value: userId }]),
    count('flashcard_decks', [{ field: 'user_id', operator: '=', value: userId }]),
    findMany<QuizAttempt>('quiz_attempts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1000,
    }),
    findMany<StudySession>('study_sessions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 1000,
    }),
  ])

  const cardsReviewed = sessions.reduce((acc, s) => acc + Number(s.cards_reviewed ?? 0), 0)
  const totalMinutes = Math.round(
    sessions.reduce((acc, s) => acc + Number(s.cards_reviewed ?? 0) * 0.5, 0) +
      quizAttempts.length * 5,
  )
  const totalHours = Math.round(totalMinutes / 60)
  const perfectQuizzes = quizAttempts.filter((a) => Number(a.score ?? 0) >= 100).length

  // Streak (consecutive active days).
  const now = new Date()
  const dayKey = (d: Date): string => d.toISOString().slice(0, 10)
  const activeDays = new Set<string>()
  for (const s of sessions) activeDays.add(dayKey(new Date(s.created_at)))
  for (const a of quizAttempts) activeDays.add(dayKey(new Date(a.created_at)))
  let streakDays = 0
  for (let i = 0; i < 365; i++) {
    const d = new Date(now.getTime() - i * DAY_MS)
    if (activeDays.has(dayKey(d))) streakDays++
    else if (i > 0) break
  }

  // Achievements (deterministic, based on user activity).
  const achievements = [
    {
      id: 'first-hundred',
      label: t('profile.ach.firstHundred', undefined, { defaultValue: 'First Hundred' }),
      description: t('profile.ach.firstHundredDesc', undefined, {
        defaultValue: 'Reviewed your first 100 cards.',
      }),
      icon: 'looks_one',
      unlocked: cardsReviewed >= 100,
    },
    {
      id: 'quiz-marathon',
      label: t('profile.ach.quizMarathon', undefined, { defaultValue: 'Quiz Marathon' }),
      description: t('profile.ach.quizMarathonDesc', undefined, {
        defaultValue: 'Completed 5 quizzes in a single week.',
      }),
      icon: 'directions_run',
      unlocked:
        quizAttempts.filter((a) => new Date(a.created_at) >= new Date(now.getTime() - 7 * DAY_MS))
          .length >= 5,
    },
    {
      id: 'streak-keeper',
      label: t('profile.ach.streakKeeper', undefined, { defaultValue: 'Streak Keeper' }),
      description: t('profile.ach.streakKeeperDesc', undefined, {
        defaultValue: 'Maintained a 14-day study streak.',
      }),
      icon: 'local_fire_department',
      unlocked: streakDays >= 14,
    },
    {
      id: 'perfect-score',
      label: t('profile.ach.perfectScore', undefined, { defaultValue: 'Perfect Score' }),
      description: t('profile.ach.perfectScoreDesc', undefined, {
        defaultValue: 'Aced a quiz with 100%.',
      }),
      icon: 'star',
      unlocked: perfectQuizzes > 0,
    },
    {
      id: 'polyglot',
      label: t('profile.ach.polyglot', undefined, { defaultValue: 'Polyglot' }),
      description: t('profile.ach.polyglotDesc', undefined, {
        defaultValue: 'Built mastery in 3 or more topics.',
      }),
      icon: 'translate',
      unlocked: topicCount >= 3,
    },
    {
      id: 'night-owl',
      label: t('profile.ach.nightOwl', undefined, { defaultValue: 'Night Owl' }),
      description: t('profile.ach.nightOwlDesc', undefined, {
        defaultValue: 'Studied past midnight on 7 different days.',
      }),
      icon: 'dark_mode',
      unlocked:
        Array.from(
          new Set(
            sessions
              .map((s) => new Date(s.created_at))
              .filter((d) => d.getHours() >= 0 && d.getHours() < 5)
              .map((d) => dayKey(d)),
          ),
        ).length >= 7,
    },
  ]

  const unlockedCount = achievements.filter((a) => a.unlocked).length

  res.json({
    profile: {
      id: user.id,
      name: user.name ?? user.email?.split('@')[0] ?? '',
      email: user.email ?? '',
      initials: initials(user.name, user.email),
      created_at: user.createdAt,
      streak_days: streakDays,
    },
    kpis: {
      active_subjects: topicCount,
      total_hours: totalHours,
      quizzes_taken: quizAttempts.length,
      decks: deckCount,
      badges_total: achievements.length,
      badges_unlocked: unlockedCount,
    },
    achievements,
  })
})

export default router
