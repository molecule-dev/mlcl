/**
 * Preferences handler — per-user voice / language / privacy / notification
 * preferences for the AI Voice Assistant.
 *
 * Stores everything inside the existing `users.oauthData` jsonb column under
 * a `voicePreferences` key so we don't have to introduce a new table just for
 * a handful of toggles. The route is per-app and isolated from
 * `@molecule/api-resource-user`'s built-in PATCH /users/:id (which only lets
 * the user update username/name/email).
 *
 * Architecture:
 *   - Reads/writes flow through `@molecule/api-database`'s DataStore
 *     (`findById`, `updateById`).  No raw SQL — gate G3.
 *   - Inputs validated with zod — gate G5.
 *   - All endpoints scope by the authenticated user — gate G6.
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

interface VoicePreferences {
  voice: string
  language: string
  privacy: Record<string, boolean>
  notifications: Record<string, boolean>
  voicePlaybackEnabled: boolean
}

const DEFAULTS: VoicePreferences = {
  voice: 'alloy',
  language: 'en-US',
  privacy: {
    transcripts: true,
    training: false,
    cloudBackup: true,
  },
  notifications: {
    reminders: true,
    productUpdates: false,
    weeklyDigest: true,
  },
  voicePlaybackEnabled: true,
}

const updateSchema = z
  .object({
    voice: z.string().min(1).max(64).optional(),
    language: z.string().min(2).max(16).optional(),
    privacy: z.record(z.string(), z.boolean()).optional(),
    notifications: z.record(z.string(), z.boolean()).optional(),
    voicePlaybackEnabled: z.boolean().optional(),
  })
  .strict()

const router = Router()

function readPrefs(row: UserRow | null): VoicePreferences {
  const oauthData = row?.oauthData ?? {}
  const stored = (oauthData as { voicePreferences?: Partial<VoicePreferences> }).voicePreferences
  return {
    voice: stored?.voice ?? DEFAULTS.voice,
    language: stored?.language ?? DEFAULTS.language,
    privacy: { ...DEFAULTS.privacy, ...(stored?.privacy ?? {}) },
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
    const next: VoicePreferences = {
      voice: parsed.data.voice ?? current.voice,
      language: parsed.data.language ?? current.language,
      privacy: { ...current.privacy, ...(parsed.data.privacy ?? {}) },
      notifications: { ...current.notifications, ...(parsed.data.notifications ?? {}) },
      voicePlaybackEnabled: parsed.data.voicePlaybackEnabled ?? current.voicePlaybackEnabled,
    }
    const oauthData: Record<string, unknown> = { ...(user.oauthData ?? {}), voicePreferences: next }
    await updateById<UserRow>('users', userId, { oauthData })
    res.json(next)
  } catch (error) {
    logger.error('preferences.update', error)
    res.status(500).json({ error: t('errors.server', {}, { defaultValue: 'Server error' }) })
  }
})

export default router
