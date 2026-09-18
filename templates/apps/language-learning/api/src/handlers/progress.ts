/**
 * Per-user progress (XP / streak / lesson completion) handlers.
 *
 * - Every endpoint scopes by SESSION user_id; the path :userId must match —
 *   no IDOR (user A cannot post completions or read progress for user B).
 * - Inputs validated via @molecule/api-middleware-validation (Zod).
 * - DataStore (no raw SQL) via @molecule/api-database; reports via
 *   `@molecule/api-reporting`.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const userIdParamSchema = z.object({ userId: z.string().min(1) })

const completeLessonSchema = z.object({
  lesson_id: z.string().min(1),
  xp_earned: z.number().int().min(0).max(10_000),
})

/** Default daily XP goal for a brand-new profile (mirrors the user_profiles column default). */
const DEFAULT_DAILY_GOAL_XP = 50

const requireSelf = (req: Request, res: Response): string | null => {
  const sessionUserId = getUserId(res)
  if (!sessionUserId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return null
  }
  const targetUserId = String(req.params.userId)
  if (sessionUserId !== targetUserId) {
    res.status(404).json({
      error: t('progress.notFound', undefined, { defaultValue: 'Profile not found.' }),
    })
    return null
  }
  return sessionUserId
}

router.get(
  '/user/:userId',
  validateParams(userIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = requireSelf(req, res)
    if (!userId) return
    const profile = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(profile ?? { user_id: userId, total_xp: 0, lessons_completed: 0, current_streak: 0 })
  },
)

router.get(
  '/user/:userId/streak',
  validateParams(userIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = requireSelf(req, res)
    if (!userId) return
    const profile = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json({
      current_streak: Number(profile?.current_streak ?? 0),
      longest_streak: Number(profile?.longest_streak ?? 0),
      last_activity: profile?.last_activity ?? null,
    })
  },
)

router.get(
  '/user/:userId/xp',
  validateParams(userIdParamSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = requireSelf(req, res)
    if (!userId) return
    const profile = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json({
      total_xp: Number(profile?.total_xp ?? 0),
      daily_goal_xp: Number(profile?.daily_goal_xp ?? 50),
      lessons_completed: Number(profile?.lessons_completed ?? 0),
    })
  },
)

router.post(
  '/user/:userId/complete-lesson',
  validateParams(userIdParamSchema),
  validateBody(completeLessonSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = requireSelf(req, res)
    if (!userId) return
    const body = req.body as z.infer<typeof completeLessonSchema>
    const xpEarned = body.xp_earned

    const profile = await findOne<Record<string, unknown>>('user_profiles', [
      { field: 'user_id', operator: '=', value: userId },
    ])

    const today = new Date()
    const dayStr = (d: unknown): string | null => (d ? String(d).slice(0, 10) : null)
    const todayStr = today.toISOString().slice(0, 10)
    const yesterdayStr = new Date(today.getTime() - 86_400_000).toISOString().slice(0, 10)

    if (profile) {
      const isNewDay = dayStr(profile.last_activity) !== todayStr
      const dailyGoal = Number(profile.daily_goal_xp ?? DEFAULT_DAILY_GOAL_XP)
      // Today's XP so far — reset when the first lesson of a new day lands.
      const priorDailyXp = isNewDay ? 0 : Number(profile.daily_xp ?? 0)
      const newDailyXp = priorDailyXp + xpEarned

      const currentStreak = Number(profile.current_streak ?? 0)
      const longestStreak = Number(profile.longest_streak ?? 0)
      // The streak is credited the moment today's XP first reaches the goal
      // (once per day). Consecutive if the goal was last met yesterday, else it
      // resets to 1. If the goal isn't reached today, the streak is untouched.
      const crossedGoalNow = priorDailyXp < dailyGoal && newDailyXp >= dailyGoal
      let newStreak = currentStreak
      let newLastGoalDate: unknown = profile.last_goal_date ?? null
      if (crossedGoalNow) {
        newStreak = dayStr(profile.last_goal_date) === yesterdayStr ? currentStreak + 1 : 1
        newLastGoalDate = todayStr
      }

      await updateMany('user_profiles', [{ field: 'user_id', operator: '=', value: userId }], {
        total_xp: Number(profile.total_xp ?? 0) + xpEarned,
        lessons_completed: Number(profile.lessons_completed ?? 0) + 1,
        daily_xp: newDailyXp,
        current_streak: newStreak,
        longest_streak: Math.max(longestStreak, newStreak),
        last_goal_date: newLastGoalDate,
        last_activity: today,
        updated_at: today,
      })
    } else {
      // Brand-new profile: credit a streak day only if this first lesson already
      // reaches the default goal.
      const hitGoal = xpEarned >= DEFAULT_DAILY_GOAL_XP
      await create('user_profiles', {
        user_id: userId,
        total_xp: xpEarned,
        lessons_completed: 1,
        daily_xp: xpEarned,
        current_streak: hitGoal ? 1 : 0,
        longest_streak: hitGoal ? 1 : 0,
        daily_goal_xp: DEFAULT_DAILY_GOAL_XP,
        last_goal_date: hitGoal ? todayStr : null,
        last_activity: today,
        target_languages: JSON.stringify([]),
        theme: 'system',
        created_at: today,
        updated_at: today,
      })
    }
    res.json({ success: true, xp_earned: xpEarned })
  },
)

export default router
