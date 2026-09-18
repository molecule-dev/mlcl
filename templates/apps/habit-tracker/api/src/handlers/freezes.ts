/**
 * Streak-freeze (a.k.a. "streak insurance") handlers.
 *
 * A freeze, when applied, lets the user skip a single day without losing
 * their streak. The default freeze policy here is "1 freeze granted per
 * week, capped at 3 stored" — see {@link grantWeeklyFreeze}. Mass-grant
 * is intended to be triggered by a cron task, but is exposed here as
 * `POST /freezes/grant` for manual / testing use.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { count, create, findById, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const useFreezeSchema = z.object({
  habit_id: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
})

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const orderBy: OrderBy[] = [{ field: 'granted_at', direction: 'desc' }]
  const freezes = await findMany('habit_freezes', { where, orderBy, limit: 200 })
  res.json(freezes)
})

router.get('/balance', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const total = await count('habit_freezes', [{ field: 'user_id', operator: '=', value: userId }])
  const used = await count('habit_freezes', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'used_for_date', operator: 'is_not_null', value: null },
  ])
  res.json({ total, used, available: total - used })
})

router.post('/grant', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const created = await grantWeeklyFreeze(userId)
  res.json(created)
})

router.post(
  '/use',
  validateBody(useFreezeSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof useFreezeSchema>
    const habit = await findById<{ user_id: string }>('habits', body.habit_id)
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }

    const unused = await findMany<{ id: string }>('habit_freezes', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'used_for_date', operator: 'is_null', value: null },
      ],
      orderBy: [{ field: 'granted_at', direction: 'asc' }],
      limit: 1,
    })
    if (unused.length === 0) {
      res.status(409).json({
        error: t('freezes.empty', undefined, { defaultValue: 'No streak freezes available.' }),
      })
      return
    }

    const freezeRow = unused[0]
    const updated = await updateById('habit_freezes', freezeRow.id, {
      habit_id: body.habit_id,
      used_for_date: body.date,
    })
    // Filing a was_freeze entry preserves the streak across the missed day.
    await create('habit_entries', {
      habit_id: body.habit_id,
      user_id: userId,
      date: body.date,
      completed_at: new Date(),
      count: 1,
      was_freeze: true,
      note: 'Auto-applied freeze',
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.json(updated.data)
  },
)

/**
 * Grants the user one freeze, capped at 3 stored. Idempotent if already
 * at cap. Used by the cron rollup and exposed as POST /grant for manual
 * / E2E flows.
 */
export async function grantWeeklyFreeze(
  userId: string,
): Promise<{ granted: boolean; available: number }> {
  const total = await count('habit_freezes', [{ field: 'user_id', operator: '=', value: userId }])
  const used = await count('habit_freezes', [
    { field: 'user_id', operator: '=', value: userId },
    { field: 'used_for_date', operator: 'is_not_null', value: null },
  ])
  const available = total - used
  if (available >= 3) {
    return { granted: false, available }
  }
  await create('habit_freezes', {
    user_id: userId,
    granted_at: new Date(),
    created_at: new Date(),
  })
  return { granted: true, available: available + 1 }
}

export default router
