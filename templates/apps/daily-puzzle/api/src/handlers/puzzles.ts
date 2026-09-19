import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, findMany, findOne, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import {
  applyResultToStats,
  computeFeedback,
  emptyStats,
  isValidDateKey,
  type LetterFeedback,
  MAX_GUESSES,
  normalizeGuess,
  pickWordForDate,
  todayUtc,
  type UserStats,
  WORD_LENGTH,
} from '../lib/puzzle-engine.js'
import { ensureSeed } from './_seed.js'

const router = Router()

/** Puzzle #1 — the share-card epoch. Deterministic from the date key. */
const PUZZLE_EPOCH = '2026-01-01'

function puzzleNumberForDate(date: string): number {
  const from = Date.parse(`${PUZZLE_EPOCH}T00:00:00.000Z`)
  const to = Date.parse(`${date}T00:00:00.000Z`)
  return Math.floor((to - from) / 86_400_000) + 1
}

const guessBodySchema = z.object({ word: z.string() })

interface PuzzleRow {
  id: string
  date: string
  word: string
}

interface GuessRow {
  id: string
  puzzle_id: string
  user_id: string
  guess_number: number
  word: string
  feedback: LetterFeedback[]
}

interface ResultRow {
  id: string
  puzzle_id: string
  user_id: string
  solved: boolean
  attempts: number
  practice: boolean
}

/** Auth guard — every puzzle route is per-user. */
function requireUserId(res: Response): string | null {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return null
  }
  return userId
}

/**
 * Lazy get-or-create of a day's puzzle. The word is picked deterministically
 * from the date, so concurrent first-players race to the identical row and
 * the UNIQUE(date) constraint simply drops the losing INSERT — there is NO
 * cron and no pre-generation job anywhere in this app.
 */
async function getOrCreatePuzzle(date: string): Promise<PuzzleRow> {
  const existing = await findOne<PuzzleRow>('puzzles', [
    { field: 'date', operator: '=', value: date },
  ])
  if (existing) return existing

  // Answer pool: common words, sorted — the exact contract of pickWordForDate.
  const common = await query<{ word: string }>(
    `SELECT word FROM public.words WHERE common = true ORDER BY word`,
    [],
  )
  const sortedCommon = common.rows.map((r) => r.word)
  const word = pickWordForDate(date, sortedCommon)

  const created = await create<PuzzleRow>('puzzles', {
    date,
    word,
    created_at: new Date(),
  })
  if (created.data) return created.data
  // Lost the race (another request created the day first) — read the winner.
  const raced = await findOne<PuzzleRow>('puzzles', [{ field: 'date', operator: '=', value: date }])
  if (!raced) throw new Error('failed to create puzzle')
  return raced
}

async function loadGuesses(puzzleId: string, userId: string): Promise<GuessRow[]> {
  const rows = await findMany<GuessRow>('guesses', {
    where: [
      { field: 'puzzle_id', operator: '=', value: puzzleId },
      { field: 'user_id', operator: '=', value: userId },
    ],
    orderBy: [{ field: 'guess_number', direction: 'asc' }],
  })
  return rows
}

async function loadResult(puzzleId: string, userId: string): Promise<ResultRow | null> {
  return findOne<ResultRow>('results', [
    { field: 'puzzle_id', operator: '=', value: puzzleId },
    { field: 'user_id', operator: '=', value: userId },
  ])
}

/**
 * The Play/ArchivePlay state payload. `answer` is only present for finished
 * games — never leaked to an in-progress player.
 */
interface PlayState {
  date: string
  puzzleNumber: number
  practice: boolean
  wordLength: number
  maxGuesses: number
  guesses: Array<{ word: string; feedback: LetterFeedback[] }>
  status: 'playing' | 'won' | 'lost'
  attempts: number
  answer?: string
}

function buildState(
  puzzle: PuzzleRow,
  guesses: GuessRow[],
  result: ResultRow | null,
  practice: boolean,
): PlayState {
  const status = result ? (result.solved ? 'won' : 'lost') : 'playing'
  return {
    date: puzzle.date,
    puzzleNumber: puzzleNumberForDate(puzzle.date),
    practice,
    wordLength: WORD_LENGTH,
    maxGuesses: MAX_GUESSES,
    guesses: guesses.map((g) => ({ word: g.word, feedback: g.feedback })),
    status,
    attempts: guesses.length,
    answer: result ? puzzle.word : undefined,
  }
}

/** Read + fold user_stats for a ranked (non-practice) finish. */
async function recordRankedFinish(
  userId: string,
  solved: boolean,
  attempts: number,
): Promise<UserStats> {
  const existing = await findOne<UserStats & { user_id: string }>('user_stats', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  const previous = existing
    ? {
        played: existing.played,
        wins: existing.wins,
        current_streak: existing.current_streak,
        max_streak: existing.max_streak,
        distribution: existing.distribution ?? {},
      }
    : emptyStats()
  const next = applyResultToStats(previous, solved, attempts)
  // pg driver requires JSONB columns receive a stringified JSON value.
  const record = { ...next, distribution: JSON.stringify(next.distribution) }
  if (existing) {
    await updateById('user_stats', existing.user_id, { ...record, updated_at: new Date() })
  } else {
    await create('user_stats', { user_id: userId, ...record, updated_at: new Date() })
  }
  return next
}

/** GET /api/puzzles/today — the daily game state (creates the day lazily). */
router.get('/today', async (_req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return
    await ensureSeed()

    const puzzle = await getOrCreatePuzzle(todayUtc())
    const [guesses, result] = await Promise.all([
      loadGuesses(puzzle.id, userId),
      loadResult(puzzle.id, userId),
    ])
    return res.json(buildState(puzzle, guesses, result, false))
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * GET /api/puzzles/archive — the last 30 days (today excluded), newest
 * first, with the requesting user's completion status. Days are derived
 * from the calendar, not from puzzle rows: an unplayed day still lists
 * (playable as practice).
 */
router.get('/archive', async (_req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const today = todayUtc()
    const days = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(`${today}T00:00:00.000Z`)
      d.setUTCDate(d.getUTCDate() - (i + 1))
      return d.toISOString().slice(0, 10)
    })

    const puzzles = await findMany<PuzzleRow>('puzzles', {
      where: [{ field: 'date', operator: 'in', value: days }],
    })
    const puzzleByDate = new Map(puzzles.map((p) => [p.date, p]))
    const puzzleIds = puzzles.map((p) => p.id)
    const results = puzzleIds.length
      ? await findMany<ResultRow>('results', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'puzzle_id', operator: 'in', value: puzzleIds },
          ],
        })
      : []
    const resultByPuzzle = new Map(results.map((r) => [r.puzzle_id, r]))

    return res.json({
      days: days.map((date) => {
        const puzzle = puzzleByDate.get(date)
        const result = puzzle ? resultByPuzzle.get(puzzle.id) : undefined
        return {
          date,
          puzzleNumber: puzzleNumberForDate(date),
          // Archive days are ALWAYS practice — never streak-affecting.
          practice: true,
          played: Boolean(result),
          solved: result?.solved ?? false,
          attempts: result?.attempts ?? 0,
        }
      }),
    })
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * GET /api/puzzles/:date — play state for a specific day. Past days are
 * practice (no streak effect); the future is not playable.
 */
router.get('/:date', async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const date = String(req.params.date ?? '')
    if (!isValidDateKey(date)) {
      return res
        .status(400)
        .json({ error: t('puzzles.invalidDate', {}, { defaultValue: 'Invalid date' }) })
    }
    if (date > todayUtc()) {
      return res.status(400).json({
        error: t('puzzles.notYetPlayable', {}, { defaultValue: 'That day has not started yet' }),
      })
    }

    await ensureSeed()
    const puzzle = await getOrCreatePuzzle(date)
    const [guesses, result] = await Promise.all([
      loadGuesses(puzzle.id, userId),
      loadResult(puzzle.id, userId),
    ])
    return res.json(buildState(puzzle, guesses, result, date < todayUtc()))
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

/**
 * POST /api/puzzles/:date/guess — submit one guess. Validation ladder:
 * 400 malformed · 409 finished/out-of-guesses · 422 not a word in the list.
 * On the game-ending guess the result row is written and (ranked play only)
 * user_stats is folded — practice finishes never touch stats.
 */
router.post('/:date/guess', validateBody(guessBodySchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUserId(res)
    if (!userId) return

    const date = String(req.params.date ?? '')
    if (!isValidDateKey(date) || date > todayUtc()) {
      return res
        .status(400)
        .json({ error: t('puzzles.invalidDate', {}, { defaultValue: 'Invalid date' }) })
    }

    const word = normalizeGuess(req.body?.word)
    if (!word) {
      return res.status(400).json({
        error: t(
          'puzzles.invalidGuess',
          {},
          {
            defaultValue: 'Guess must be 5 letters A-Z',
          },
        ),
      })
    }

    const puzzle = await getOrCreatePuzzle(date)
    const existingResult = await loadResult(puzzle.id, userId)
    if (existingResult) {
      return res.status(409).json({
        error: t('puzzles.alreadyFinished', {}, { defaultValue: 'Already finished this puzzle' }),
        state: buildState(
          puzzle,
          await loadGuesses(puzzle.id, userId),
          existingResult,
          date < todayUtc(),
        ),
      })
    }

    const guesses = await loadGuesses(puzzle.id, userId)
    if (guesses.length >= MAX_GUESSES) {
      return res.status(409).json({
        error: t('puzzles.alreadyFinished', {}, { defaultValue: 'Already finished this puzzle' }),
      })
    }

    const known = await count('words', [{ field: 'word', operator: '=', value: word }])
    if (known === 0) {
      return res.status(422).json({
        error: t('puzzles.notInWordList', {}, { defaultValue: 'Not in the word list' }),
      })
    }

    const feedback = computeFeedback(word, puzzle.word)
    await create('guesses', {
      puzzle_id: puzzle.id,
      user_id: userId,
      guess_number: guesses.length + 1,
      word,
      feedback: JSON.stringify(feedback), // JSONB columns take stringified JSON
      created_at: new Date(),
    })

    const allGuesses = [...guesses, { word, feedback }]
    const solved = word === puzzle.word
    const finished = solved || allGuesses.length >= MAX_GUESSES
    let stats: UserStats | undefined
    if (finished) {
      const practice = date < todayUtc()
      await create('results', {
        puzzle_id: puzzle.id,
        user_id: userId,
        solved,
        attempts: allGuesses.length,
        practice,
        finished_at: new Date(),
        created_at: new Date(),
      })
      if (!practice) stats = await recordRankedFinish(userId, solved, allGuesses.length)
    }

    return res.status(201).json({
      feedback,
      guesses: allGuesses.map((g) => ({ word: g.word, feedback: g.feedback })),
      status: finished ? (solved ? 'won' : 'lost') : 'playing',
      attempts: allGuesses.length,
      answer: finished ? puzzle.word : undefined,
      stats,
    })
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
