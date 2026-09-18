/**
 * Shared display helpers for assignment / grade / schedule rows.
 *
 * Centralised so dashboard, list, and detail screens render identical
 * subject pills and due-date copy.
 */

import type { AssignmentStatus, AssignmentSubject } from '../components/AssignmentRow.js'
import type { GradeLetter } from '../components/GradeBadge.js'

export interface ApiAssignment {
  id: string
  course_id?: string | null
  course_name?: string | null
  user_id: string
  title: string
  description?: string | null
  due_date?: string | Date | null
  points?: number | string | null
  status: 'upcoming' | 'submitted' | 'overdue' | 'graded'
  submitted_at?: string | Date | null
  created_at: string | Date
}

export interface ApiGrade {
  id: string
  user_id: string
  course_id?: string | null
  course_name?: string | null
  subject?: string | null
  score?: number | string | null
  letter_grade?: string | null
  weight?: number | string | null
  graded_at: string | Date
}

/**
 * The correct "current grade" for a set of graded work: a weighted average
 * `Σ(score·weight) / Σweight`, each grade's `weight` defaulting to 1. A flat mean ignores the stored
 * per-grade `weight` and disagrees with the backend GPA/report-card and the Grades list page.
 * Returns 0 for an empty set (or when all weights are 0).
 */
export function weightedAverage(grades: ApiGrade[]): number {
  const totalWeight = grades.reduce((acc, g) => acc + Number(g.weight ?? 1), 0)
  if (totalWeight <= 0) return 0
  const totalScore = grades.reduce(
    (acc, g) => acc + Number(g.score ?? 0) * Number(g.weight ?? 1),
    0,
  )
  return totalScore / totalWeight
}

export interface ApiScheduleEntry {
  id: string
  user_id: string
  course_id?: string | null
  course_name?: string | null
  subject?: string | null
  teacher?: string | null
  room?: string | null
  period_label?: string | null
  weekday?: number | null
  day?: number | null
  start_time?: string | null
  end_time?: string | null
  date?: string | Date | null
}

export interface ApiAttendance {
  id: string
  user_id: string
  course_id?: string | null
  date: string | Date
  weekday?: number | null
  status: 'present' | 'tardy' | 'absent' | 'excused'
  classes: number
  note?: string | null
}

export interface ApiMessage {
  id: string
  user_id: string
  recipient_id: string
  thread_id?: string | null
  sender_name?: string | null
  content: string
  read_at?: string | Date | null
  created_at: string | Date
}

export interface ApiAnnouncement {
  id: string
  user_id: string
  audience: 'school' | 'class' | 'self'
  icon?: string | null
  title: string
  body?: string | null
  pinned: boolean
  created_at: string | Date
}

const SUBJECT_NAMES: Record<string, AssignmentSubject> = {
  math: 'math',
  science: 'science',
  english: 'english',
  history: 'history',
  art: 'art',
  pe: 'pe',
  language: 'language',
}

const COURSE_TO_SUBJECT: Array<{ match: RegExp; subject: AssignmentSubject }> = [
  { match: /algebra|math|calc|geometry/i, subject: 'math' },
  { match: /bio|chem|physic|science|lab/i, subject: 'science' },
  { match: /english|lit|writing|essay|crucible/i, subject: 'english' },
  { match: /history|civics|geography/i, subject: 'history' },
  { match: /art|studio|design|sketch/i, subject: 'art' },
  { match: /pe|gym|health|cardio|track/i, subject: 'pe' },
  { match: /spanish|french|german|language|capitulo/i, subject: 'language' },
]

export function subjectFor(courseName?: string | null, subject?: string | null): AssignmentSubject {
  if (subject && SUBJECT_NAMES[subject]) return SUBJECT_NAMES[subject]
  if (!courseName) return 'other'
  for (const { match, subject: s } of COURSE_TO_SUBJECT) {
    if (match.test(courseName)) return s
  }
  return 'other'
}

export function statusFor(s: string | null | undefined): AssignmentStatus {
  if (s === 'submitted') return 'submitted'
  if (s === 'graded') return 'graded'
  if (s === 'overdue') return 'missing'
  return 'due'
}

export function dueLabel(due: string | Date | null | undefined): string {
  if (!due) return 'TBD'
  const d = typeof due === 'string' ? new Date(due) : due
  if (Number.isNaN(d.getTime())) return 'TBD'
  const now = new Date()
  const dayMs = 86400000
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / dayMs)
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  if (diffDays === 0) return `Today, ${time}`
  if (diffDays === 1) return `Tomorrow, ${time}`
  if (diffDays > 1 && diffDays < 7)
    return `${d.toLocaleDateString(undefined, { weekday: 'short' })}, ${time}`
  if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)}d overdue`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function letterFor(score: number | null | undefined): GradeLetter {
  if (score == null) return 'F'
  const s = Number(score)
  if (s >= 95) return 'A'
  if (s >= 90) return 'A'
  if (s >= 85) return 'B'
  if (s >= 80) return 'B'
  if (s >= 75) return 'C'
  if (s >= 70) return 'C'
  if (s >= 65) return 'D'
  if (s >= 60) return 'D'
  return 'F'
}

export function weekdayLabel(weekday: number | null | undefined): string {
  if (weekday == null) return ''
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[weekday] ?? ''
}

export function timeAgo(ts: string | Date | null | undefined): string {
  if (!ts) return ''
  const d = typeof ts === 'string' ? new Date(ts) : ts
  if (Number.isNaN(d.getTime())) return ''
  const diffMs = Date.now() - d.getTime()
  const m = Math.floor(diffMs / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hr`
  const dDays = Math.floor(h / 24)
  if (dDays < 7) return `${dDays}d`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
