/**
 * Leaderboard endpoint for the LMS dashboard.
 *
 * Aggregates `lesson_completions` per user and joins on `users` to return
 * the top N learners by total completed lessons. The current user is
 * included in the result if they have at least one completion (the front
 * end highlights their row by `userId`); if they're not in the top N,
 * the front end can show an empty / climb-the-board state.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface LeaderboardRow {
  userId: string
  name: string | null
  completedLessons: number
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '10'), 10) || 10, 1), 50)
    const result = await query<{
      user_id: string
      name: string | null
      completed_lessons: string | number
    }>(
      `
      SELECT
        lc.user_id AS user_id,
        u.name AS name,
        COUNT(*)::int AS completed_lessons
      FROM lesson_completions lc
      JOIN users u ON u.id = lc.user_id
      GROUP BY lc.user_id, u.name
      ORDER BY completed_lessons DESC, u.name ASC
      LIMIT $1
      `,
      [limit],
    )
    const rows: LeaderboardRow[] = result.rows.map((r) => ({
      userId: r.user_id,
      name: r.name,
      completedLessons:
        typeof r.completed_lessons === 'string'
          ? parseInt(r.completed_lessons, 10) || 0
          : r.completed_lessons,
    }))
    res.json(rows)
  } catch (error) {
    logger.error(error)
    res.status(500).json({
      error: t('leaderboard.fetchError', {}, { defaultValue: 'Failed to fetch leaderboard' }),
    })
  }
})

export default router
