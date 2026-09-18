/**
 * Settings handler — per-user cadence + notification preferences.
 *
 * Persists rows in `user_settings` (one per user, lazily created on first
 * PATCH). Powers the /settings page toggles. Returns shaped defaults when
 * no row exists so the FE can always render.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { requireUser } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface SettingsRow {
  user_id?: string
  cadence?: string | null
  preferences?: Record<string, unknown> | string | null
  updated_at?: string | Date | null
}

const DEFAULTS = {
  cadence: 'weekly' as 'weekly' | 'biweekly',
  preferences: {
    weeklyReminders: true,
    mondayDigest: true,
    coachingNudges: false,
  },
}

const cadenceEnum = z.enum(['weekly', 'biweekly'])

const patchSchema = z.object({
  cadence: cadenceEnum.optional(),
  preferences: z
    .object({
      weeklyReminders: z.boolean().optional(),
      mondayDigest: z.boolean().optional(),
      coachingNudges: z.boolean().optional(),
    })
    .partial()
    .optional(),
})

function decodeJson<T>(v: unknown, fallback: T): T {
  if (!v) return fallback
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T
    } catch (_error) {
      // JSON.parse failed on stored string — fall back to default value
      return fallback
    }
  }
  if (typeof v === 'object') return v as T
  return fallback
}

function shape(row: SettingsRow | null): {
  cadence: 'weekly' | 'biweekly'
  preferences: typeof DEFAULTS.preferences
  updated_at: string | null
} {
  const cadence = row?.cadence === 'biweekly' ? 'biweekly' : 'weekly'
  const prefs = decodeJson<Partial<typeof DEFAULTS.preferences>>(row?.preferences, {})
  const merged = { ...DEFAULTS.preferences, ...prefs }
  return {
    cadence,
    preferences: merged,
    updated_at: row?.updated_at ? String(row.updated_at) : null,
  }
}

async function readSettings(uid: string): Promise<SettingsRow | null> {
  return await findOne<SettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: uid },
  ])
}

async function ensureSettings(uid: string): Promise<SettingsRow> {
  const existing = await readSettings(uid)
  if (existing) return existing
  await create('user_settings', {
    user_id: uid,
    cadence: DEFAULTS.cadence,
    preferences: JSON.stringify(DEFAULTS.preferences),
  })
  return (await readSettings(uid)) ?? { user_id: uid }
}

router.get('/', async (_req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  try {
    const row = await readSettings(uid)
    res.json(shape(row))
  } catch (error) {
    logger.error('settings.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', async (req: Request, res: Response) => {
  const uid = requireUser(res)
  if (!uid) return
  const parsed = patchSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: t('validation.failed', {}, { defaultValue: 'Validation failed' }),
      issues: parsed.error.issues,
    })
    return
  }
  try {
    const existing = await ensureSettings(uid)
    const currentPrefs = decodeJson<Partial<typeof DEFAULTS.preferences>>(existing.preferences, {})
    const nextPrefs = {
      ...DEFAULTS.preferences,
      ...currentPrefs,
      ...(parsed.data.preferences ?? {}),
    }
    const updates: Record<string, unknown> = { updated_at: new Date() }
    if (parsed.data.cadence) updates.cadence = parsed.data.cadence
    if (parsed.data.preferences !== undefined) updates.preferences = JSON.stringify(nextPrefs)
    await updateMany('user_settings', [{ field: 'user_id', operator: '=', value: uid }], updates)
    const fresh = await readSettings(uid)
    res.json(shape(fresh))
  } catch (error) {
    logger.error('settings.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
