/**
 * Habit-entry handlers.
 *
 * Each entry represents one day's check-in for a habit. Streak/best-streak/
 * total-completion fields on the parent habit are recomputed after each
 * insert via {@link recomputeStreaks}. The freeze auto-application logic
 * lives here too — when a user has unused freezes and skipped a day, a
 * freeze row is consumed and a `was_freeze=true` entry is filed on their
 * behalf.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import { create, deleteMany, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import { formatLocalDate, type HabitRow, recomputeStreaks } from './_streaks.js'

const router = Router()

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')

const createEntrySchema = z.object({
  habit_id: z.string().min(1),
  date: isoDate.optional(),
  count: z.number().int().min(1).max(100).optional(),
  was_freeze: z.boolean().optional(),
  note: z.string().max(2000).optional(),
})

const listEntriesSchema = z.object({
  habit_id: z.string().min(1).optional(),
  start_date: isoDate.optional(),
  end_date: isoDate.optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
})

router.get(
  '/',
  validateQuery(listEntriesSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const { habit_id, start_date, end_date, from, to, limit } = req.query as z.infer<
      typeof listEntriesSchema
    >
    const lower = start_date ?? from
    const upper = end_date ?? to
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (habit_id) {
      // Verify ownership of the habit before scoping to it.
      const habit = await findById<HabitRow>('habits', habit_id)
      if (!habit || habit.user_id !== userId) {
        res.status(404).json({
          error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
        })
        return
      }
      where.push({ field: 'habit_id', operator: '=', value: habit_id })
    }
    if (lower) {
      where.push({ field: 'date', operator: '>=', value: lower })
    }
    if (upper) {
      where.push({ field: 'date', operator: '<=', value: upper })
    }

    const orderBy: OrderBy[] = [{ field: 'date', direction: 'desc' }]
    const entries = await findMany<Record<string, unknown> & { date: Date | string }>(
      'habit_entries',
      {
        where,
        orderBy,
        limit: limit ?? 365,
      },
    )
    // `completed` reflects the habit's per-day goal, not just "any activity": an entry is complete
    // when its count reaches the owning habit's target_count (default 1) or it's a freeze day. Load
    // the targets for the habits these entries belong to (one row when scoped by habit_id).
    const entryHabitIds = [
      ...new Set(entries.map((e) => String((e as { habit_id?: string }).habit_id ?? ''))),
    ].filter(Boolean)
    const targetByHabit = new Map<string, number>()
    if (entryHabitIds.length > 0) {
      const habitRows = await findMany<{ id: string; target_count?: number }>('habits', {
        where: [
          { field: 'id', operator: 'in', value: entryHabitIds },
          { field: 'user_id', operator: '=', value: userId },
        ],
      })
      for (const h of habitRows) targetByHabit.set(h.id, Math.max(1, Number(h.target_count ?? 1)))
    }
    res.json(
      entries.map((e) => {
        const target = targetByHabit.get(String((e as { habit_id?: string }).habit_id ?? '')) ?? 1
        const count = (e as { count?: number }).count ?? 0
        const wasFreeze = Boolean((e as { was_freeze?: boolean }).was_freeze)
        return {
          ...e,
          date: e.date instanceof Date ? formatLocalDate(e.date) : String(e.date).slice(0, 10),
          completed: wasFreeze || count >= target,
        }
      }),
    )
  },
)

router.post(
  '/',
  validateBody(createEntrySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const body = req.body as z.infer<typeof createEntrySchema>
    const habit = await findById<HabitRow>('habits', body.habit_id)
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }

    const date = body.date ?? formatLocalDate(new Date())
    const existing = await findOne<{ id: string; count: number }>('habit_entries', [
      { field: 'habit_id', operator: '=', value: body.habit_id },
      { field: 'date', operator: '=', value: date },
    ])

    if (existing) {
      const updated = await updateById('habit_entries', existing.id, {
        count: body.count ?? existing.count + 1,
        note: body.note ?? null,
        updated_at: new Date(),
      })
      await recomputeStreaks(habit, userId)
      res.json(updated.data)
      return
    }

    const result = await create('habit_entries', {
      habit_id: body.habit_id,
      user_id: userId,
      date,
      completed_at: new Date(),
      count: body.count ?? 1,
      was_freeze: body.was_freeze ?? false,
      note: body.note ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await recomputeStreaks(habit, userId)
    res.status(201).json(result.data)
  },
)

router.delete(
  '/:id',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const id = String(req.params.id)
    const entry = await findById<{ user_id: string; habit_id: string }>('habit_entries', id)
    if (!entry || entry.user_id !== userId) {
      res.status(404).json({
        error: t('entries.notFound', undefined, { defaultValue: 'Entry not found.' }),
      })
      return
    }
    await deleteMany('habit_entries', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])

    const habit = await findById<HabitRow>('habits', entry.habit_id)
    if (habit) await recomputeStreaks(habit, userId)
    res.status(204).end()
  },
)

export default router
