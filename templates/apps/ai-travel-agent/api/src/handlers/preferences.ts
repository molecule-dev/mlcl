/**
 * Preferences handler — per-user voice, language, phone and notification
 * preferences for the AI Travel Agent.
 *
 * Stores everything inside the existing `users.oauthData` jsonb column under
 * a `travelPreferences` key so a handful of toggles need no table of their
 * own. `phone` is where the agent texts rebooking notices. The route is
 * per-app and isolated from `@molecule/api-resource-user`'s built-in
 * PATCH /users/:id (which only lets the user update username/name/email).
 *
 * Architecture:
 *   - Reads/writes flow through `@molecule/api-database`'s DataStore
 *     (`findById`, `updateById`).  No raw SQL.
 *   - Inputs validated with zod.
 *   - All endpoints scope by the authenticated user.
 */

import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

interface UserRow {
  id: string
  oauthData: Record<string, unknown> | null
}

interface TravelPreferences {
  voice: string
  language: string
  phone: string
  homeAirport: string
  notifications: Record<string, boolean>
  voicePlaybackEnabled: boolean
}

const DEFAULTS: TravelPreferences = {
  voice: 'alloy',
  language: 'en-US',
  phone: '',
  homeAirport: '',
  notifications: {
    delays: true,
    payments: true,
    productUpdates: false,
  },
  voicePlaybackEnabled: true,
}

const updateSchema = z
  .object({
    voice: z.string().min(1).max(64).optional(),
    language: z.string().min(2).max(16).optional(),
    phone: z
      .string()
      .max(24)
      .regex(/^(\+?[0-9][0-9\s-]{6,})?$/)
      .optional(),
    homeAirport: z
      .string()
      .max(3)
      .regex(/^([A-Za-z]{3})?$/)
      .optional(),
    notifications: z.record(z.string(), z.boolean()).optional(),
    voicePlaybackEnabled: z.boolean().optional(),
  })
  .strict()

const router = Router()

function readPrefs(row: UserRow | null): TravelPreferences {
  const oauthData = row?.oauthData ?? {}
  const stored = (oauthData as { travelPreferences?: Partial<TravelPreferences> }).travelPreferences
  return {
    voice: stored?.voice ?? DEFAULTS.voice,
    language: stored?.language ?? DEFAULTS.language,
    phone: stored?.phone ?? DEFAULTS.phone,
    homeAirport: stored?.homeAirport ?? DEFAULTS.homeAirport,
    notifications: { ...DEFAULTS.notifications, ...(stored?.notifications ?? {}) },
    voicePlaybackEnabled: stored?.voicePlaybackEnabled ?? DEFAULTS.voicePlaybackEnabled,
  }
}

router.get('/', async (_req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    res.json(readPrefs(user))
  } catch (error) {
    logger.error('preferences.get', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

router.put('/', async (req, res) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('errors.unauthorized', {}, { defaultValue: 'Not authorized' }) })
      return
    }
    const parsed = updateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: t('errors.badRequest', {}, { defaultValue: 'Bad request' }) })
      return
    }
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.status(404).json({ error: t('errors.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    const current = readPrefs(user)
    const next: TravelPreferences = {
      voice: parsed.data.voice ?? current.voice,
      language: parsed.data.language ?? current.language,
      phone: parsed.data.phone?.trim() ?? current.phone,
      homeAirport: parsed.data.homeAirport?.toUpperCase() ?? current.homeAirport,
      notifications: { ...current.notifications, ...(parsed.data.notifications ?? {}) },
      voicePlaybackEnabled: parsed.data.voicePlaybackEnabled ?? current.voicePlaybackEnabled,
    }
    const oauthData: Record<string, unknown> = {
      ...(user.oauthData ?? {}),
      travelPreferences: next,
    }
    await updateById<UserRow>('users', userId, { oauthData })
    res.json(next)
  } catch (error) {
    logger.error('preferences.update', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
