import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { emptyStats, serializeStats, type UserStats } from '../lib/puzzle-engine.js'

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
    // Shared serializer: camelCase + winRate + all six bins, identical to
    // the game-ending guess response.
    return res.json(serializeStats(row ?? emptyStats()))
  } catch (error) {
    logger.error('stats.load_failed', error)
    return res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
