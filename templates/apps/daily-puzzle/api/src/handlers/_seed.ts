/**
 * Demo seed for daily-puzzle.
 *
 * Two layers, both idempotent (guarded by row-count checks so server
 * restarts never double-seed):
 *
 * 1. **Dictionary** (`seedGlobalWordsIfEmpty`) — loads
 *    `api/fixtures/words.json` into the `words` table. The common subset is
 *    the answer pool; every row is a valid guess.
 *
 * 2. **Demo players** (`seedGlobalDemoPlayersIfEmpty`) — a handful of demo
 *    accounts with two weeks of finished daily results + the user_stats
 *    projection computed by the SAME fold the runtime uses, so /leaderboard
 *    (streak board) and /archive render with content on a fresh DB.
 *
 * There is no per-user seed: this app has no notifications/inbox surface.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

import { count, create, query } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import {
  applyResultToStats,
  emptyStats,
  pickWordForDate,
  type UserStats,
} from '../lib/puzzle-engine.js'

interface WordFixture {
  word: string
  common: boolean
}

/** Resolves to api/fixtures/words.json from BOTH src/ (tsx watch) and dist/. */
const WORDS_FIXTURE_URL = new URL('../../fixtures/words.json', import.meta.url)

async function loadWordFixtures(): Promise<WordFixture[]> {
  const raw = JSON.parse(await readFile(WORDS_FIXTURE_URL, 'utf-8')) as WordFixture[]
  if (!Array.isArray(raw) || raw.length === 0) throw new Error('words fixture empty or malformed')
  return raw
}

/** Idempotent: skipped once any word exists. Batched multi-row INSERTs. */
export async function seedGlobalWordsIfEmpty(): Promise<{ wordsCreated: number }> {
  const existing = await count('words', [])
  if (existing > 0) return { wordsCreated: 0 }

  const fixtures = await loadWordFixtures()
  const BATCH = 100
  for (let i = 0; i < fixtures.length; i += BATCH) {
    const batch = fixtures.slice(i, i + BATCH)
    const params: unknown[] = []
    const tuples = batch.map((entry, j) => {
      params.push(entry.word, entry.common)
      return `($${j * 2 + 1}, $${j * 2 + 2})`
    })
    await query(
      `INSERT INTO public.words (word, common) VALUES ${tuples.join(', ')}
       ON CONFLICT (word) DO NOTHING`,
      params,
    )
  }
  return { wordsCreated: fixtures.length }
}

/** UTC calendar-day arithmetic: date key N days before `dateKey`. */
function daysBefore(dateKey: string, days: number): string {
  const base = new Date(`${dateKey}T00:00:00.000Z`)
  base.setUTCDate(base.getUTCDate() - days)
  return base.toISOString().slice(0, 10)
}

interface DemoPlayer {
  name: string
  email: string
  username: string
  /** Outcomes oldest→newest (13 days ago → yesterday): attempts 1-6 = won, 0 = lost, null = skipped. */
  outcomes: Array<number | null>
}

const DEMO_PLAYERS: DemoPlayer[] = [
  {
    name: 'Ada Cross',
    email: 'ada@lexlet.example',
    username: 'lex.ada',
    outcomes: [4, 3, 5, 0, 3, 2, 4, 3, 3, 2, 4, 3, 2, 3],
  },
  {
    name: 'Grace Fowler',
    email: 'grace@lexlet.example',
    username: 'lex.grace',
    outcomes: [null, 5, 4, 4, 0, 5, 3, 4, null, 4, 5, 4, null, 5],
  },
  {
    name: 'Alan Turner',
    email: 'alan@lexlet.example',
    username: 'lex.alan',
    outcomes: [3, 0, null, 5, 5, 4, 0, null, 5, 4, 5, null, 4, 5],
  },
  {
    name: 'Kat Marsh',
    email: 'kat@lexlet.example',
    username: 'lex.kat',
    outcomes: [null, null, 6, 5, 0, 6, null, 5, 5, null, 6, 5, 0, 6],
  },
  {
    name: 'Lin Reyes',
    email: 'lin@lexlet.example',
    username: 'lex.lin',
    outcomes: [5, null, 0, null, 6, null, 5, null, 0, 6, null, null, 5, null],
  },
]

/**
 * Idempotent: skipped once any result row exists. Creates demo players, the
 * last 14 days of puzzles (same deterministic pick the lazy path uses), one
 * result per played day, and the user_stats projection folded from those
 * results — never written by hand, so the seeded numbers can't drift from
 * what the runtime would have produced.
 */
export async function seedGlobalDemoPlayersIfEmpty(): Promise<{
  playersCreated: number
  resultsCreated: number
}> {
  const existing = await count('results', [])
  if (existing > 0) return { playersCreated: 0, resultsCreated: 0 }

  const today = new Date().toISOString().slice(0, 10)
  // Answer pool must match the runtime pick exactly: common words, sorted.
  const common = await query<{ word: string }>(
    `SELECT word FROM public.words WHERE common = true ORDER BY word`,
    [],
  )
  const sortedCommon = common.rows.map((r) => r.word)
  if (sortedCommon.length === 0) throw new Error('word list empty — seed words first')

  const dates = Array.from({ length: 14 }, (_, i) => daysBefore(today, 14 - i))
  // Lazily create each day's puzzle with the deterministic pick (UNIQUE date
  // absorbs races, exactly like the runtime get-or-create).
  const puzzleIds = new Map<string, string>()
  for (const date of dates) {
    const word = pickWordForDate(date, sortedCommon)
    const inserted = await query<{ id: string }>(
      `INSERT INTO public.puzzles (date, word) VALUES ($1, $2)
       ON CONFLICT (date) DO UPDATE SET date = EXCLUDED.date
       RETURNING id`,
      [date, word],
    )
    puzzleIds.set(date, inserted.rows[0].id)
  }

  let playersCreated = 0
  let resultsCreated = 0
  for (const player of DEMO_PLAYERS) {
    const userResult = await query<{ id: string }>(
      `INSERT INTO public.users (id, "createdAt", "updatedAt", name, email, username, "planKey")
       VALUES (gen_random_uuid(), now(), now(), $1, $2, $3, 'free')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [player.name, player.email, player.username],
    )
    const userId = userResult.rows[0]?.id
    if (!userId) continue
    playersCreated++

    let stats: UserStats = emptyStats()
    for (let i = 0; i < player.outcomes.length; i++) {
      const outcome = player.outcomes[i]
      if (outcome === null) continue
      const solved = outcome > 0
      const attempts = solved ? outcome : 6
      const puzzleId = puzzleIds.get(dates[i])
      if (!puzzleId) continue
      await create('results', {
        puzzle_id: puzzleId,
        user_id: userId,
        solved,
        attempts,
        practice: false,
        finished_at: new Date(),
        created_at: new Date(),
      })
      resultsCreated++
      // Demo history is all ranked daily play — same fold the handler runs.
      stats = applyResultToStats(stats, solved, attempts)
    }

    // pg driver requires JSONB columns receive a stringified JSON value.
    await query(
      `INSERT INTO public.user_stats (user_id, played, wins, current_streak, max_streak, distribution, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE SET
         played = EXCLUDED.played, wins = EXCLUDED.wins,
         current_streak = EXCLUDED.current_streak, max_streak = EXCLUDED.max_streak,
         distribution = EXCLUDED.distribution, updated_at = now()`,
      [
        userId,
        stats.played,
        stats.wins,
        stats.current_streak,
        stats.max_streak,
        JSON.stringify(stats.distribution),
      ],
    )
  }

  return { playersCreated, resultsCreated }
}

/** Both layers, in dependency order. Called at the END of setupBonds(). */
export async function seedGlobalPuzzleDataIfEmpty(): Promise<void> {
  await seedGlobalWordsIfEmpty()
  await seedGlobalDemoPlayersIfEmpty()
}

/**
 * Best-effort wrapper used by the puzzles handler so the dictionary seeds on
 * first read after a fresh DB without coupling the seed to server boot.
 * Errors are swallowed so a failed seed doesn't break the read.
 */
export async function ensureSeed(): Promise<void> {
  try {
    await seedGlobalPuzzleDataIfEmpty()
  } catch (err) {
    logger.warn(err)
  }
}
