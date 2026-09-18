/**
 * `/api/users/me/preferences` — round-trippable per-user settings.
 *
 * Backs the Settings page so target language, daily XP goal, theme, and
 * notification toggles persist across reload (and across devices, since
 * they live in `user_profiles`, not localStorage). Always scoped to the
 * SESSION user — no IDOR.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const prefsSchema = z
  .object({
    target_languages: z.array(z.string().min(1).max(10)).max(20).optional(),
    daily_goal_xp: z.number().int().min(10).max(2000).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    reminder_enabled: z.boolean().optional(),
    reminder_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    streak_alerts_enabled: z.boolean().optional(),
    email_digest_enabled: z.boolean().optional(),
  })
  .strict()

interface PrefsRow {
  target_languages: string | string[] | null
  daily_goal_xp: number | string
  theme: string
  reminder_enabled: boolean
  reminder_time: string
  streak_alerts_enabled: boolean
  email_digest_enabled: boolean
}

function shape(row: PrefsRow | null): {
  target_languages: string[]
  daily_goal_xp: number
  theme: string
  reminder_enabled: boolean
  reminder_time: string
  streak_alerts_enabled: boolean
  email_digest_enabled: boolean
} {
  if (!row) {
    return {
      target_languages: [],
      daily_goal_xp: 50,
      theme: 'system',
      reminder_enabled: true,
      reminder_time: '19:00',
      streak_alerts_enabled: true,
      email_digest_enabled: false,
    }
  }
  let langs: string[] = []
  if (Array.isArray(row.target_languages)) langs = row.target_languages as string[]
  else if (typeof row.target_languages === 'string') {
    try {
      const parsed = JSON.parse(row.target_languages)
      if (Array.isArray(parsed)) langs = parsed as string[]
    } catch (_error) {
      // JSON.parse failed; fall back to empty array as a safe default.
      langs = []
    }
  }
  return {
    target_languages: langs,
    daily_goal_xp: Number(row.daily_goal_xp ?? 50),
    theme: row.theme ?? 'system',
    reminder_enabled: row.reminder_enabled !== false,
    reminder_time: row.reminder_time ?? '19:00',
    streak_alerts_enabled: row.streak_alerts_enabled !== false,
    email_digest_enabled: row.email_digest_enabled === true,
  }
}

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const profile = await findOne<PrefsRow>('user_profiles', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  res.json(shape(profile))
})

router.patch('/', validateBody(prefsSchema), async (req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const body = req.body as z.infer<typeof prefsSchema>
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (body.target_languages !== undefined)
    updates.target_languages = JSON.stringify(body.target_languages)
  if (body.daily_goal_xp !== undefined) updates.daily_goal_xp = body.daily_goal_xp
  if (body.theme !== undefined) updates.theme = body.theme
  if (body.reminder_enabled !== undefined) updates.reminder_enabled = body.reminder_enabled
  if (body.reminder_time !== undefined) updates.reminder_time = body.reminder_time
  if (body.streak_alerts_enabled !== undefined)
    updates.streak_alerts_enabled = body.streak_alerts_enabled
  if (body.email_digest_enabled !== undefined)
    updates.email_digest_enabled = body.email_digest_enabled

  const existing = await findOne<PrefsRow>('user_profiles', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (!existing) {
    const now = new Date()
    await create('user_profiles', {
      user_id: userId,
      total_xp: 0,
      lessons_completed: 0,
      current_streak: 0,
      longest_streak: 0,
      daily_goal_xp: 50,
      last_activity: null,
      target_languages: JSON.stringify([]),
      theme: 'system',
      reminder_enabled: true,
      reminder_time: '19:00',
      streak_alerts_enabled: true,
      email_digest_enabled: false,
      created_at: now,
      updated_at: now,
      ...updates,
    })
  } else {
    await updateMany('user_profiles', [{ field: 'user_id', operator: '=', value: userId }], updates)
  }

  const updated = await findOne<PrefsRow>('user_profiles', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  res.json(shape(updated))
})

export default router
