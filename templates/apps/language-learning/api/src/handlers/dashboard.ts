/**
 * Per-user dashboard aggregator.
 *
 * One endpoint that backs the entire `/dashboard` page in a single call:
 * streak / xp / today / words mastered / minutes / week-history / list of
 * recommended lessons + the user's friends-leaderboard entry.
 *
 * Also bootstraps a user_profiles row on first hit, and seeds a small
 * starter vocabulary deck so the Vocabulary page is non-empty for fresh
 * accounts. Idempotent — repeat calls do not duplicate rows.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { seedCatalogOnce } from './_seed.js'

const router = Router()

const STARTER_VOCAB = [
  {
    word: 'desayuno',
    pronunciation: '/de.saˈʝu.no/',
    translation: 'breakfast',
    example: 'El desayuno está listo en la cocina.',
    language_code: 'es',
  },
  {
    word: 'biblioteca',
    pronunciation: '/bi.βljoˈte.ka/',
    translation: 'library',
    example: 'Estudio en la biblioteca todos los sábados.',
    language_code: 'es',
  },
  {
    word: 'imprescindible',
    pronunciation: '/im.pɾes.θinˈdi.βle/',
    translation: 'essential, indispensable',
    example: 'Una buena pronunciación es imprescindible.',
    language_code: 'es',
  },
  {
    word: 'amistad',
    pronunciation: '/a.misˈtað/',
    translation: 'friendship',
    example: 'La amistad sincera no se rompe con la distancia.',
    language_code: 'es',
  },
  {
    word: 'sorprender',
    pronunciation: '/soɾ.pɾenˈdeɾ/',
    translation: 'to surprise',
    example: 'Quería sorprender a mi madre con un viaje.',
    language_code: 'es',
  },
  {
    word: 'crecimiento',
    pronunciation: '/kɾe.θiˈmjen.to/',
    translation: 'growth',
    example: 'El crecimiento personal lleva tiempo.',
    language_code: 'es',
  },
]

interface ProfileRow {
  user_id: string
  total_xp: number
  lessons_completed: number
  current_streak: number
  longest_streak: number
  daily_goal_xp: number
  last_activity: string | null
  target_languages: string | string[] | null
  theme: string
  reminder_enabled: boolean
  reminder_time: string
  streak_alerts_enabled: boolean
  email_digest_enabled: boolean
}

async function ensureUserProfile(userId: string): Promise<ProfileRow> {
  const existing = await findOne<ProfileRow>('user_profiles', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const now = new Date()
  await create('user_profiles', {
    user_id: userId,
    total_xp: 0,
    lessons_completed: 0,
    current_streak: 0,
    longest_streak: 0,
    daily_goal_xp: 50,
    last_activity: null,
    target_languages: JSON.stringify([]),
    theme: 'system',
    reminder_enabled: true,
    reminder_time: '19:00',
    streak_alerts_enabled: true,
    email_digest_enabled: false,
    created_at: now,
    updated_at: now,
  })
  return {
    user_id: userId,
    total_xp: 0,
    lessons_completed: 0,
    current_streak: 0,
    longest_streak: 0,
    daily_goal_xp: 50,
    last_activity: null,
    target_languages: [],
    theme: 'system',
    reminder_enabled: true,
    reminder_time: '19:00',
    streak_alerts_enabled: true,
    email_digest_enabled: false,
  }
}

async function ensureStarterVocab(userId: string): Promise<void> {
  const existing = await count('vocabulary_items', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing > 0) return
  const now = new Date()
  for (const v of STARTER_VOCAB) {
    await create('vocabulary_items', {
      user_id: userId,
      word: v.word,
      pronunciation: v.pronunciation,
      translation: v.translation,
      example: v.example,
      language_code: v.language_code,
      mastery: 0,
      next_review_iso: now,
      created_at: now,
      updated_at: now,
    })
  }
}

interface ResultRow {
  xp_earned: number | string
  is_correct: boolean | string
  time_taken_ms: number | string
  completed_at: string
  exercise_id: string
}

router.get('/user/me/summary', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  // Bootstrap content for a fresh user (idempotent).
  await seedCatalogOnce()
  const profile = await ensureUserProfile(userId)
  await ensureStarterVocab(userId)

  // 7-day XP history from exercise_results.
  const sevenAgo = new Date()
  sevenAgo.setDate(sevenAgo.getDate() - 7)
  const sevenWhere: WhereCondition[] = [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'completed_at', operator: '>=', value: sevenAgo.toISOString() },
  ]
  const sevenOrder: OrderBy[] = [{ field: 'completed_at', direction: 'asc' }]
  const recent = (await findMany<ResultRow>('exercise_results', {
    where: sevenWhere,
    orderBy: sevenOrder,
    limit: 5000,
  })) as ResultRow[]

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const today = recent.filter((r) => new Date(r.completed_at) >= todayStart)
  const todayXp = today.reduce((sum, r) => sum + Number(r.xp_earned ?? 0), 0)
  const minutesToday = Math.round(
    today.reduce((s, r) => s + Number(r.time_taken_ms ?? 0), 0) / 60_000,
  )

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const history: Array<{ day: string; xp: number; iso: string }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const next = new Date(d)
    next.setDate(d.getDate() + 1)
    const dayResults = recent.filter((r) => {
      const t = new Date(r.completed_at).getTime()
      return t >= d.getTime() && t < next.getTime()
    })
    const dayXp = dayResults.reduce((s, r) => s + Number(r.xp_earned ?? 0), 0)
    history.push({ day: days[d.getDay()], xp: dayXp, iso: d.toISOString().slice(0, 10) })
  }

  // Words mastered = vocabulary items with mastery >= 4
  const wordsMastered = await count('vocabulary_items', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'mastery', operator: '>=', value: 4 },
  ])

  // Recommended lessons: top 3 by position from courses the user is enrolled in,
  // or top 3 from any course if no enrollment yet.
  const enrollments = await findMany<{ course_id: string }>('course_enrollments', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 50,
  })
  const enrolledIds = (enrollments as Array<{ course_id: string }>).map((e) => e.course_id)
  const lessonsWhere: WhereCondition[] = enrolledIds.length
    ? [{ field: 'course_id', operator: 'in', value: enrolledIds }]
    : []
  const recommendedLessons = await findMany('lessons', {
    where: lessonsWhere,
    orderBy: [{ field: 'created_at', direction: 'asc' }],
    limit: 3,
  })

  res.json({
    profile: {
      total_xp: Number(profile.total_xp ?? 0),
      lessons_completed: Number(profile.lessons_completed ?? 0),
      current_streak: Number(profile.current_streak ?? 0),
      longest_streak: Number(profile.longest_streak ?? 0),
      daily_goal_xp: Number(profile.daily_goal_xp ?? 50),
      last_activity: profile.last_activity ?? null,
      target_languages: parseTargetLangs(profile.target_languages),
      theme: profile.theme ?? 'system',
    },
    // Top-level mirror of profile fields under the camel/snake names the
    // frontend expects, so a single GET drives the entire dashboard hero
    // (streak, total XP, daily goal) without a second round-trip.
    current_streak: Number(profile.current_streak ?? 0),
    longest_streak: Number(profile.longest_streak ?? 0),
    total_xp: Number(profile.total_xp ?? 0),
    daily_goal: Number(profile.daily_goal_xp ?? 50),
    today_xp: todayXp,
    minutes_today: minutesToday,
    words_mastered: wordsMastered,
    history,
    recommended_lessons: recommendedLessons,
  })
})

function parseTargetLangs(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[]
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as string[]) : []
    } catch (_error) {
      // JSON.parse failed; fall back to empty array as a safe default.
      return []
    }
  }
  return []
}

export default router
