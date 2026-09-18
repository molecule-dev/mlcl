/**
 * Habit CRUD handlers.
 *
 * - Every read/write scopes by `user_id` (ownership) — no IDOR.
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - Tier-based limit enforcement via @molecule/api-entitlements.
 * - DataStore (no raw SQL) via @molecule/api-database.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, idParamSchema } from '@molecule/api-bonds-default-express'
import type { OrderBy, WhereCondition } from '@molecule/api-database'
import {
  count,
  create,
  deleteMany,
  findById,
  findMany,
  findOne,
  query,
  updateById,
} from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams, validateQuery } from '@molecule/api-middleware-validation'

import type { HabitTrackerLimits } from '../tiers.js'
import { formatLocalDate, recomputeStreaks } from './_streaks.js'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const enforceMaxHabits = enforceLimit<HabitTrackerLimits>({
  limitType: 'maxHabits',
  getLimit: (limits) => limits.maxHabits,
  getCurrent: async (userId) =>
    count('habits', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'archived_at', operator: 'is_null', value: null },
    ]),
}) as unknown as RequestHandler

const cadenceEnum = z.enum(['daily', 'weekly', 'custom'])
const daysOfWeekSchema = z.array(z.number().int().min(0).max(6)).max(7)

const createHabitSchema = z.object({
  name: z.string().min(1).max(255),
  emoji: z.string().max(16).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().max(64).nullable().optional(),
  cadence: cadenceEnum.default('daily'),
  days_of_week: daysOfWeekSchema.optional(),
  reminder_time: z.string().max(8).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  target_count: z.number().int().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
})

const updateHabitSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  emoji: z.string().max(16).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.string().max(64).nullable().optional(),
  cadence: cadenceEnum.optional(),
  days_of_week: daysOfWeekSchema.optional(),
  reminder_time: z.string().max(8).nullable().optional(),
  color: z.string().max(32).nullable().optional(),
  target_count: z.number().int().min(1).max(100).optional(),
  position: z.number().int().min(0).optional(),
})

const listQuerySchema = z.object({
  archived: z.enum(['true', 'false', 'any']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

router.get(
  '/',
  validateQuery(listQuerySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }

    const { archived, limit, offset } = req.query as z.infer<typeof listQuerySchema>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (archived === 'false' || archived === undefined) {
      where.push({ field: 'archived_at', operator: 'is_null', value: null })
    } else if (archived === 'true') {
      where.push({ field: 'archived_at', operator: 'is_not_null', value: null })
    }

    const orderBy: OrderBy[] = [
      { field: 'position', direction: 'asc' },
      { field: 'created_at', direction: 'desc' },
    ]
    const habits = await findMany<{ id: string; target_count?: number }>('habits', {
      where,
      orderBy,
      limit: limit ?? 100,
      offset: offset ?? 0,
    })
    if (habits.length === 0) {
      res.json([])
      return
    }
    const today = formatLocalDate(new Date())
    const ids = habits.map((h) => h.id)
    // A habit is done today only when today's entry count reaches its target (default 1), so a
    // 3×/day habit isn't marked complete after one check-in; a freeze day counts regardless.
    const entriesRes = await query<{ habit_id: string; count: number; was_freeze: boolean }>(
      `SELECT habit_id, count, was_freeze FROM public.habit_entries WHERE habit_id = ANY($1::uuid[]) AND date = $2`,
      [ids, today],
    )
    const targetById = new Map(habits.map((h) => [h.id, Math.max(1, Number(h.target_count ?? 1))]))
    const completedSet = new Set<string>()
    for (const r of entriesRes.rows) {
      const target = targetById.get(String(r.habit_id)) ?? 1
      if (r.was_freeze || Number(r.count) >= target) completedSet.add(String(r.habit_id))
    }
    res.json(habits.map((h) => ({ ...h, completed_today: completedSet.has(h.id) })))
  },
)

router.get(
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

    const habit = await findById<Record<string, unknown>>('habits', idOf(req))
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    res.json(habit)
  },
)

router.post(
  '/',
  enforceMaxHabits,
  validateBody(createHabitSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof createHabitSchema>
    const result = await create('habits', {
      user_id: userId,
      name: body.name,
      emoji: body.emoji ?? null,
      description: body.description ?? null,
      category: body.category ?? null,
      cadence: body.cadence,
      // Stringify so pg writes a JSON value rather than coercing the JS
      // array into a Postgres array literal (the column is JSONB).
      days_of_week: JSON.stringify(body.days_of_week ?? [0, 1, 2, 3, 4, 5, 6]),
      reminder_time: body.reminder_time ?? null,
      color: body.color ?? null,
      target_count: body.target_count ?? 1,
      position: body.position ?? 0,
      current_streak: 0,
      longest_streak: 0,
      total_completions: 0,
      created_at: new Date(),
      updated_at: new Date(),
    })
    res.status(201).json(result.data)
  },
)

router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateHabitSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('habits', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    const incoming = { ...(req.body as Record<string, unknown>) }
    if (incoming.days_of_week !== undefined) {
      // JSONB column — pg would otherwise serialize a JS array as a
      // postgres array literal and fail with "invalid input syntax for type json".
      incoming.days_of_week = JSON.stringify(incoming.days_of_week)
    }
    const updates = { ...incoming, updated_at: new Date() }
    const result = await updateById('habits', id, updates)
    res.json(result.data)
  },
)

/**
 * Check in for today (or for a body-supplied date). Idempotent: re-check-in on
 * the same day increments the entry count rather than creating a duplicate.
 *
 * Returns the new entry plus the recomputed habit row so the frontend can
 * keep the dashboard chip in sync without a follow-up GET.
 */
const checkInBodySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')
      .optional(),
    count: z.number().int().min(1).max(100).optional(),
    note: z.string().max(2000).optional(),
  })
  .partial()

router.post(
  '/:id/check-in',
  validateParams(idParamSchema),
  validateBody(checkInBodySchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const habit = await findById<{
      id: string
      user_id: string
      longest_streak: number
      total_completions: number
    }>('habits', id)
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof checkInBodySchema>
    const date = body.date ?? formatLocalDate(new Date())
    const existing = await findOne<{ id: string; count: number }>('habit_entries', [
      { field: 'habit_id', operator: '=', value: id },
      { field: 'date', operator: '=', value: date },
    ])
    if (existing) {
      const updated = await updateById('habit_entries', existing.id, {
        count: body.count ?? existing.count + 1,
        note: body.note ?? null,
        updated_at: new Date(),
      })
      await recomputeStreaks(habit, userId)
      const refreshed = await findById('habits', id)
      res.json({ entry: updated.data, habit: refreshed })
      return
    }
    const result = await create('habit_entries', {
      habit_id: id,
      user_id: userId,
      date,
      completed_at: new Date(),
      count: body.count ?? 1,
      was_freeze: false,
      note: body.note ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    })
    await recomputeStreaks(habit, userId)
    const refreshed = await findById('habits', id)
    res.status(201).json({ entry: result.data, habit: refreshed })
  },
)

/**
 * Un-check today's entry for a habit. Removes the row for `date` (default:
 * today) and recomputes streaks; idempotent (no-op if there's no entry).
 */
router.delete(
  '/:id/check-in',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const habit = await findById<{
      id: string
      user_id: string
      longest_streak: number
      total_completions: number
    }>('habits', id)
    if (!habit || habit.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    const dateParam = typeof req.query.date === 'string' ? req.query.date : null
    const date =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : formatLocalDate(new Date())
    await deleteMany('habit_entries', [
      { field: 'habit_id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
      { field: 'date', operator: '=', value: date },
    ])
    await recomputeStreaks(habit, userId)
    const refreshed = await findById('habits', id)
    res.json({ removed: true, habit: refreshed })
  },
)

router.post(
  '/:id/archive',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('habits', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    await updateById('habits', id, {
      archived_at: new Date(),
      updated_at: new Date(),
    })
    res.json({ archived: true })
  },
)

router.post(
  '/:id/unarchive',
  validateParams(idParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('habits', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    await updateById('habits', id, {
      archived_at: null,
      updated_at: new Date(),
    })
    res.json({ archived: false })
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
    const id = idOf(req)
    const existing = await findById<Record<string, unknown>>('habits', id)
    if (!existing || existing.user_id !== userId) {
      res.status(404).json({
        error: t('habits.notFound', undefined, { defaultValue: 'Habit not found.' }),
      })
      return
    }
    await deleteMany('habit_entries', [{ field: 'habit_id', operator: '=', value: id }])
    await deleteMany('reminders', [{ field: 'habit_id', operator: '=', value: id }])
    await deleteMany('habits', [
      { field: 'id', operator: '=', value: id },
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.status(204).end()
  },
)

export default router
