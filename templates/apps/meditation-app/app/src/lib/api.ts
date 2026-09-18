/**
 * Types and helpers for the meditation-app REST API.
 *
 * The backend returns resource arrays directly (no envelope), and accepts
 * snake_case in DB-mirroring shapes. Pages call these via the http client
 * from `useHttpClient()`.
 *
 * @module
 */

import type { CategoryTone } from './categoryTone.js'

export interface ApiCategory {
  id: string
  slug: string
  label: string
  description: string | null
  hero_image_key: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface ApiSession {
  id: string
  category_id: string | null
  slug: string
  title: string
  description: string | null
  duration_seconds: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  instructor_name: string | null
  audio_s3_key: string | null
  transcript_text: string | null
  hero_image_key: string | null
  language: string
  is_premium: boolean
  is_published: boolean
  published_at: string | null
  created_at: string
}

export interface ApiCourse {
  id: string
  slug: string
  title: string
  description: string | null
  day_count: number
  hero_image_key: string | null
  is_premium: boolean
  is_published: boolean
  created_at: string
}

export interface ApiCourseDay {
  id: string
  course_id: string
  day_number: number
  session_id: string | null
  title: string | null
  prep_text: string | null
  created_at: string
}

export interface ApiCourseDetail extends ApiCourse {
  days: ApiCourseDay[]
}

export interface ApiHistory {
  id: string
  user_id: string
  session_id: string | null
  course_id: string | null
  started_at: string
  completed_at: string | null
  duration_seconds: number
  reflection_id: string | null
  created_at: string
}

export interface ApiJournalEntry {
  id: string
  user_id: string
  session_id: string | null
  title: string | null
  body: string
  mood: number | null
  tags: string[] | string
  written_at: string
  created_at: string
}

export interface ApiNotification {
  id: string
  user_id: string
  kind: string
  payload: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export interface ApiStatsStreak {
  current_streak: number
  longest_streak: number
  total_sessions: number
  total_days: number
}

export interface ApiStatsSummary {
  minutes_total: number
  minutes_this_week: number
  sessions_this_week: number
  weekly_goal_minutes: number
  calm_score: number
}

export interface ApiStatsDaily {
  date: string
  minutes: number
  sessions: number
}

export interface ApiBillingTier {
  key: string
  name: string
  prices: Array<{ period: 'month' | 'year'; price: string; stripePriceId: string | null }>
  limits: Record<string, number | boolean>
}

export interface ApiBillingStatus {
  planKey: string
  category: string
  name: string
  limits: Record<string, number | boolean>
  isFree: boolean
}

export interface ApiUserPreferences {
  user_id?: string
  voice: string
  default_duration_minutes: number
  reminder_enabled: boolean
  reminder_time: string
  autoplay_next: boolean
  weekly_goal_minutes: number
}

export interface ApiStatsSummaryServer {
  total_sessions: number
  total_minutes: number
  avg_duration_minutes: number
  unique_days: number
}

export interface ApiStatsDailyServer {
  date: string
  sessions: number
  minutes: number
}

const SLUG_TO_TONE: Record<string, CategoryTone> = {
  mindfulness: 'mindfulness',
  sleep: 'sleep',
  focus: 'focus',
  stress: 'stress',
  body: 'body',
}

/** Map a category slug from the backend to the visual tone used for tinting. */
export function toneFor(slug: string | null | undefined): CategoryTone {
  if (!slug) return 'mindfulness'
  return SLUG_TO_TONE[slug] ?? 'mindfulness'
}

/** Convert duration in seconds to whole minutes (rounded up so 30s → 1 min). */
export function toMinutes(seconds: number): number {
  return Math.max(1, Math.round(seconds / 60))
}
