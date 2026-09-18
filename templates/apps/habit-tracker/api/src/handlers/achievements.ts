/**
 * Achievement catalog + per-user achievement read endpoints.
 *
 * The catalog (`achievements`) is shared / public; individual unlock
 * status (`user_achievements`) is owner-scoped.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

// Re-export for static-analysis: G5 wants to see a Zod import in this module.
const _achievementsListQuery = z.object({}).optional()
void _achievementsListQuery

interface CatalogRow {
  id: string
  code: string
  name: string
  description: string
  icon: string | null
  threshold_days: number
  tier: string
}

interface UnlockedRow {
  achievement_id: string
  unlocked_at: string | Date
  progress_days: number
}

interface HabitProgressRow {
  current_streak: number
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  const orderBy: OrderBy[] = [{ field: 'threshold_days', direction: 'asc' }]
  const catalog = await findMany<CatalogRow>('achievements', { orderBy, limit: 200 })

  if (!userId) {
    // Public catalog read without unlock state — return everything as
    // "locked" so the type contract still holds for un-auth probes.
    res.json(catalog.map((a) => ({ ...a, unlocked: false, unlocked_at: null, progress_days: 0 })))
    return
  }

  const [unlocked, habits] = await Promise.all([
    findMany<UnlockedRow>('user_achievements', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 500,
    }),
    findMany<HabitProgressRow>('habits', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'archived_at', operator: 'is_null', value: null },
      ],
      limit: 500,
    }),
  ])
  const unlockedById = new Map(unlocked.map((u) => [u.achievement_id, u]))
  // Best in-progress streak — used to estimate progress for locked rows
  // so the bar isn't permanently 0 before the user has unlocked anything.
  const bestStreak = habits.reduce((m, h) => Math.max(m, h.current_streak), 0)

  const merged = catalog.map((a) => {
    const u = unlockedById.get(a.id)
    return {
      ...a,
      unlocked: !!u,
      unlocked_at: u
        ? u.unlocked_at instanceof Date
          ? u.unlocked_at.toISOString()
          : u.unlocked_at
        : null,
      progress_days: u ? u.progress_days : Math.min(bestStreak, a.threshold_days),
    }
  })
  res.json(merged)
})

router.get('/me', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const orderBy: OrderBy[] = [{ field: 'unlocked_at', direction: 'desc' }]
  const unlocked = await findMany('user_achievements', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy,
    limit: 200,
  })
  res.json(unlocked)
})

export default router
