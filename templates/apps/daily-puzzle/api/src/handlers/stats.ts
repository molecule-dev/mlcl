import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

import { emptyStats, MAX_GUESSES, type UserStats } from '../lib/puzzle-engine.js'

const router = Router()

/** GET /api/stats/me — the user's ranked-daily stats projection. */
router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const row = await findOne<UserStats & { user_id: string }>('user_stats', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const stats = row ?? emptyStats()

    // Distribution always carries all six bins so the histogram renders a
    // full frame even before the first game.
    const distribution: Record<string, number> = {}
    for (let i = 1; i <= MAX_GUESSES; i++)
      distribution[String(i)] = stats.distribution?.[String(i)] ?? 0

    return res.json({
      played: stats.played,
      wins: stats.wins,
      winRate: stats.played > 0 ? Math.round((100 * stats.wins) / stats.played) : 0,
      currentStreak: stats.current_streak,
      maxStreak: stats.max_streak,
      distribution,
    })
  } catch (error) {
    console.error(error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
