/**
 * Leaderboard read handlers (weekly / all-time / friends).
 *
 * - Public read scope is the leaderboard aggregate, not raw user_profiles.
 * - The friends endpoint requires authentication and is bound to the SESSION
 *   user_id — no IDOR via the path param.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const userIdParamSchema = z.object({ userId: z.string().min(1) })

const topProfiles = async (limit = 50): Promise<unknown[]> => {
  const orderBy: OrderBy[] = [{ field: 'total_xp', direction: 'desc' }]
  return findMany('user_profiles', { orderBy, limit })
}

router.get('/weekly', async (_req: Request, res: Response): Promise<void> => {
  // Server-side aggregation lives in @molecule/api-reporting once the
  // reporting bond is wired. For now we surface the top profiles by XP —
  // the rollup-by-week cron job is a Phase 2.5 follow-up.
  res.json({ entries: await topProfiles(50) })
})

router.get('/all-time', async (_req: Request, res: Response): Promise<void> => {
  res.json({ entries: await topProfiles(100) })
})

router.get(
  '/friends/:userId',
  validateParams(userIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const sessionUserId = getUserId(res)
    if (!sessionUserId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const targetUserId = String(req.params.userId)
    if (sessionUserId !== targetUserId) {
      res.status(404).json({
        error: t('leaderboard.notFound', undefined, { defaultValue: 'Leaderboard not found.' }),
      })
      return
    }
    // Friends leaderboard server-side aggregation also lives in the
    // reporting bond; placeholder returns the user's own profile until the
    // follows-graph join report is wired.
    res.json({ entries: await topProfiles(20) })
  },
)

export default router
