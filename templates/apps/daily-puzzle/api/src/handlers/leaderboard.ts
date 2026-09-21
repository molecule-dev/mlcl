import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { aggregate, type Filter } from '@molecule/api-reporting'

import { isValidDateKey, todayUtc } from '../lib/puzzle-engine.js'

const router = Router()

/**
 * GET /api/leaderboard?date=YYYY-MM-DD (default today)
 *
 * Two boards on one page:
 *  - `daily` — the per-day solve distribution: how many players finished at
 *    each attempt count (ranked results only — practice never counts).
 *  - `streakLeaders` — top user_stats by max streak, display names joined in
 *    a second query (bond-owned lookups; no hand-rolled SQL join).
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const date = req.query.date ? String(req.query.date) : todayUtc()
    if (!isValidDateKey(date)) {
      return res
        .status(400)
        .json({ error: t('puzzles.invalidDate', {}, { defaultValue: 'Invalid date' }) })
    }

    const puzzle = await findOne<{ id: string; date: string; word: string }>('puzzles', [
      { field: 'date', operator: '=', value: date },
    ])

    // A day nobody has played yet has no puzzle row — render an empty board.
    let solvesByAttempt: Array<{ attempts: number; players: number }> = []
    let totalPlayers = 0
    if (puzzle) {
      const filters: Filter[] = [
        { field: 'puzzle_id', operator: 'eq', value: puzzle.id },
        { field: 'practice', operator: 'eq', value: false },
      ]
      const [solvedReport, playedReport] = await Promise.all([
        aggregate({
          table: 'results',
          measures: [{ field: 'id', function: 'count', alias: 'players' }],
          dimensions: ['attempts'],
          filters: [...filters, { field: 'solved', operator: 'eq', value: true }],
          orderBy: [{ field: 'attempts', direction: 'asc' }],
          limit: 10,
        }),
        aggregate({
          table: 'results',
          measures: [{ field: 'id', function: 'count', alias: 'players' }],
          dimensions: [],
          filters,
          limit: 1,
        }),
      ])
      solvesByAttempt = solvedReport.rows.map((row) => ({
        attempts: Number(row.attempts),
        players: Number(row.players),
      }))
      totalPlayers = Number(playedReport.rows[0]?.players ?? 0)
    }
    const totalSolves = solvesByAttempt.reduce((sum, bin) => sum + bin.players, 0)

    const statRows = await findMany<{
      user_id: string
      played: number
      wins: number
      current_streak: number
      max_streak: number
    }>('user_stats', {
      orderBy: [
        { field: 'max_streak', direction: 'desc' },
        { field: 'current_streak', direction: 'desc' },
        { field: 'wins', direction: 'desc' },
      ],
      limit: 10,
    })
    const userIds = statRows.map((r) => r.user_id)
    const users = userIds.length
      ? await findMany<{ id: string; name: string; username: string }>('users', {
          where: [{ field: 'id', operator: 'in', value: userIds }],
        })
      : []
    const nameById = new Map(users.map((u) => [u.id, u.name || u.username]))

    return res.json({
      date,
      daily: {
        date,
        players: totalPlayers,
        solves: totalSolves,
        solvesByAttempt,
      },
      streakLeaders: statRows.map((row, index) => ({
        rank: index + 1,
        name: nameById.get(row.user_id) ?? '—',
        played: row.played,
        wins: row.wins,
        currentStreak: row.current_streak,
        maxStreak: row.max_streak,
      })),
    })
  } catch (error) {
    logger.error('leaderboard.load_failed', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
