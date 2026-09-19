/**
 * Shared reading-domain helpers used by the book-tracker handlers.
 *
 * Not a router — exempted from the e2e handler inventory
 * (see e2e/handler-exemptions.txt).
 */

/** The four shelves a book can sit on (mirrors the DB CHECK constraint). */
export type Shelf = 'want_to_read' | 'reading' | 'read' | 'dnf'

export const SHELVES: Shelf[] = ['want_to_read', 'reading', 'read', 'dnf']

/** Cover styles offered by AddBook — keys map to CSS gradients in the app. */
export const COVER_STYLES = [
  'teal',
  'amber',
  'wine',
  'indigo',
  'forest',
  'slate',
  'plum',
  'clay',
] as const

export function isShelf(value: unknown): value is Shelf {
  return typeof value === 'string' && (SHELVES as string[]).includes(value)
}

/**
 * Parse a `genres` JSONB value into a string[]. The pg driver returns JSONB
 * parsed, but values written through partial updates can arrive as strings —
 * accept both shapes.
 */
export function parseGenres(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((g) => String(g))
  if (typeof value === 'string' && value.length > 0) {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed.map((g) => String(g)) : []
    } catch (_error) {
      // A genres value that is neither an array nor valid JSON is not an
      // error worth surfacing — the caller treats it as "no genres".
      return []
    }
  }
  return []
}

/** Format a Date (or ISO string) as a local YYYY-MM-DD date string. */
export function formatLocalDate(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** True when `year` is the current calendar year. */
export function isCurrentYear(year: number): boolean {
  return year === new Date().getFullYear()
}

/**
 * Challenge pace snapshot for a year.
 *
 * - `books_read` counts finished books (shelf 'read') whose finished_at falls
 *   in the year.
 * - `on_pace` compares books_read against the elapsed fraction of the year
 *   (only meaningful mid-year; a finished year is on pace iff the goal was
 *   met).
 */
export interface ChallengeProgress {
  year: number
  goal_books: number
  books_read: number
  percent: number
  on_pace: boolean
  books_behind: number
  /** Books per week the user needs from today to land exactly on the goal. */
  pace_needed_per_week: number
  day_of_year: number
  days_in_year: number
}

export function computeChallengeProgress(
  year: number,
  goalBooks: number,
  booksRead: number,
  now = new Date(),
): ChallengeProgress {
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)
  const daysInYear = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  const dayOfYear = Math.min(
    daysInYear,
    Math.max(0, Math.round((now.getTime() - start.getTime()) / 86_400_000) + 1),
  )
  const percent = goalBooks <= 0 ? 0 : Math.min(1, booksRead / goalBooks)
  const elapsed = dayOfYear / daysInYear
  const expected = goalBooks * elapsed
  const onPace =
    now >= end ? booksRead >= goalBooks : goalBooks === 0 || booksRead >= Math.floor(expected)
  const weeksLeft = Math.max(0, (daysInYear - dayOfYear) / 7)
  const paceNeededPerWeek = weeksLeft <= 0 ? 0 : Math.max(0, (goalBooks - booksRead) / weeksLeft)
  return {
    year,
    goal_books: goalBooks,
    books_read: booksRead,
    percent,
    on_pace: onPace,
    books_behind: Math.max(0, Math.round(expected - booksRead)),
    pace_needed_per_week: Math.round(paceNeededPerWeek * 10) / 10,
    day_of_year: dayOfYear,
    days_in_year: daysInYear,
  }
}

/** A reading-session row shape shared across handlers. */
export interface SessionRow {
  id: string
  user_book_id: string
  user_id: string
  date: string
  minutes: number
  pages_read: number
  note: string | null
  created_at: string | Date
}

/** A user_books row shape shared across handlers. */
export interface UserBookRow {
  id: string
  user_id: string
  book_id: string
  shelf: Shelf
  current_page: number
  started_at: string | null
  finished_at: string | null
  rating: number | null
  review: string | null
  created_at: string | Date
  updated_at: string | Date
}

/** A books row shape shared across handlers. */
export interface BookRow {
  id: string
  user_id: string
  title: string
  author: string
  page_count: number
  genres: string | string[]
  cover_style: string
  description: string | null
  created_at: string | Date
  updated_at: string | Date
}
