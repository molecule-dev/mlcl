/**
 * Pure daily-puzzle game logic — no DB, no Express, no bonds.
 *
 * Kept dependency-free (node:crypto only) so BOTH the API handlers and the
 * vitest suites import the exact same functions the runtime uses — the
 * deterministic word pick and the feedback algorithm are never re-implemented
 * in a test (a re-implementation can only agree with itself).
 *
 * @module
 */

import { createHash } from 'node:crypto'

/** Letters per word. The whole game is parameterized on this one constant. */
export const WORD_LENGTH = 5

/** Maximum guesses per game. */
export const MAX_GUESSES = 6

/** Per-letter feedback state, stored as the JSONB `guesses.feedback` array. */
export type LetterFeedback = 'correct' | 'present' | 'absent'

/** UTC calendar day as the 'YYYY-MM-DD' key used by the puzzles table. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** True for a well-formed 'YYYY-MM-DD' string (puzzle date param guard). */
export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * Deterministic answer pick: SHA-256(domain + date) over the SORTED common
 * word list. Same date → same word for every player and every restart, with
 * no cron and no coordination — the first player of the day lazily creates
 * the row, and concurrent first-players race to the identical word (the
 * UNIQUE(date) constraint absorbs the loser).
 *
 * The list MUST be pre-sorted (the callers sort in SQL) so the index is
 * stable regardless of insertion order.
 */
export function pickWordForDate(date: string, sortedCommonWords: string[]): string {
  if (sortedCommonWords.length === 0) throw new Error('empty word list')
  const digest = createHash('sha256').update(`daily-puzzle:${date}`).digest('hex')
  // 48 bits of digest is far beyond any list size and stays well under
  // Number.MAX_SAFE_INTEGER.
  const index = Number.parseInt(digest.slice(0, 12), 16) % sortedCommonWords.length
  return sortedCommonWords[index]
}

/**
 * Wordle-style two-pass feedback: greens first, then yellows consume the
 * remaining unmatched answer letters — a duplicate guess letter can only
 * match as many times as the answer actually contains it.
 */
export function computeFeedback(guess: string, answer: string): LetterFeedback[] {
  const feedback: LetterFeedback[] = new Array(WORD_LENGTH).fill('absent')
  const remaining = new Map<string, number>()
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) {
      feedback[i] = 'correct'
    } else {
      remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1)
    }
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (feedback[i] === 'correct') continue
    const left = remaining.get(guess[i]) ?? 0
    if (left > 0) {
      feedback[i] = 'present'
      remaining.set(guess[i], left - 1)
    }
  }
  return feedback
}

/** The user_stats projection shape (JSONB distribution keyed by attempt no.). */
export interface UserStats {
  played: number
  wins: number
  current_streak: number
  max_streak: number
  distribution: Record<string, number>
}

export function emptyStats(): UserStats {
  return { played: 0, wins: 0, current_streak: 0, max_streak: 0, distribution: {} }
}

/**
 * Fold ONE finished non-practice game into a stats object. Pure — callers
 * persist the result. Wins extend the streak (and the max); any loss resets
 * the current streak to zero. `attempts` is 1-based.
 */
export function applyResultToStats(stats: UserStats, solved: boolean, attempts: number): UserStats {
  const distribution = { ...stats.distribution }
  if (solved) {
    const key = String(attempts)
    distribution[key] = (distribution[key] ?? 0) + 1
  }
  const currentStreak = solved ? stats.current_streak + 1 : 0
  return {
    played: stats.played + 1,
    wins: stats.wins + (solved ? 1 : 0),
    current_streak: currentStreak,
    max_streak: Math.max(stats.max_streak, currentStreak),
    distribution,
  }
}

/** Normalize a submitted guess: lowercase a-z only, exactly WORD_LENGTH. */
export function normalizeGuess(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return /^[a-z]{5}$/.test(normalized) ? normalized : null
}

/**
 * The wire shape of a stats projection — camelCase, winRate derived, and the
 * distribution padded to all six bins. BOTH stats surfaces must serialize
 * through this: GET /api/stats/me AND the game-ending guess response (the
 * result card reads currentStreak/winRate off it). Before this helper the
 * guess route leaked the raw snake_case row, so the card rendered
 * "Streak: 🔥" / "Win rate: %" with no values.
 */
export function serializeStats(stats: UserStats): {
  played: number
  wins: number
  winRate: number
  currentStreak: number
  maxStreak: number
  distribution: Record<string, number>
} {
  const distribution: Record<string, number> = {}
  for (let i = 1; i <= MAX_GUESSES; i++)
    distribution[String(i)] = stats.distribution?.[String(i)] ?? 0
  return {
    played: stats.played,
    wins: stats.wins,
    winRate: stats.played > 0 ? Math.round((100 * stats.wins) / stats.played) : 0,
    currentStreak: stats.current_streak,
    maxStreak: stats.max_streak,
    distribution,
  }
}

/**
 * Turn finished guesses into the shareable emoji grid (🟩🟨⬛ + header/footer),
 * built client-side from feedback the API already returned — but the mapping
 * lives here so a server-side test pins the exact emoji semantics.
 */
export function buildShareText(
  puzzleNumber: number,
  guesses: Array<{ word: string; feedback: LetterFeedback[] }>,
  solved: boolean,
  stats?: Pick<UserStats, 'current_streak'>,
): string {
  const tile = (state: LetterFeedback): string =>
    state === 'correct' ? '🟩' : state === 'present' ? '🟨' : '⬛'
  const grid = guesses.map((g) => g.feedback.map(tile).join('')).join('\n')
  const lines = [
    `Daily Puzzle #${puzzleNumber} ${solved ? '✅' : '❌'} ${guesses.length}/${MAX_GUESSES}`,
  ]
  lines.push(grid)
  if (stats) lines.push(`🔥 ${stats.current_streak}`)
  return lines.join('\n')
}
