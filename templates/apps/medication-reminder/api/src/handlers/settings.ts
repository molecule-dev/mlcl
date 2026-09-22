/**
 * Settings channel — `GET /api/settings/me` + `PATCH /api/settings/me`.
 *
 * The Settings page's Reminders / Default pharmacy / Appearance panels drive
 * their data from here. The platform user resource NEVER returns `oauthData`
 * on reads (`stripSensitiveUserColumns` removes it — it is a denylist that
 * includes real OAuth material), so anything persisted through
 * `PATCH /api/users/:id` inside `oauthData` silently evaporates on the next
 * `GET /users/me`. This channel reads and merges the app's slice SERVER-SIDE
 * instead, so preferences survive a reload.
 *
 * App settings live inside `users.oauthData.settings` (the JSONB blob the
 * Settings page has always written — same slice path, now written through a
 * channel that can read it back).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  oauthData: Record<string, unknown> | null
}

/** Mirrors the Settings page's `SettingsData` (defaults included). */
const DEFAULT_SETTINGS = {
  notifications: {
    dosePush: true,
    preDose: true,
    missed: true,
    refillWarn: true,
    caregiverEscalation: false,
    quietStart: '22:00',
    quietEnd: '07:00',
  },
  pharmacy: {
    name: '',
    address: '',
    phone: '',
    autoRequest: true,
  },
  appearance: {
    largeText: false,
    highContrast: false,
    timeFormat: '12h' as '12h' | '24h',
  },
}

type SettingsData = typeof DEFAULT_SETTINGS

const settingsPatchSchema = z
  .object({
    notifications: z
      .object({
        dosePush: z.boolean().optional(),
        preDose: z.boolean().optional(),
        missed: z.boolean().optional(),
        refillWarn: z.boolean().optional(),
        caregiverEscalation: z.boolean().optional(),
        quietStart: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        quietEnd: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
      })
      .partial()
      .optional(),
    pharmacy: z
      .object({
        name: z.string().max(255).optional(),
        address: z.string().max(1023).optional(),
        phone: z.string().max(64).optional(),
        autoRequest: z.boolean().optional(),
      })
      .partial()
      .optional(),
    appearance: z
      .object({
        largeText: z.boolean().optional(),
        highContrast: z.boolean().optional(),
        timeFormat: z.enum(['12h', '24h']).optional(),
      })
      .partial()
      .optional(),
    // The Profile page's medical + emergency slices live in the same
    // unreadable `oauthData` bag — carried through this channel so they
    // survive a reload too.
    profile: z
      .object({
        dob: z.string().max(32).optional(),
        phone: z.string().max(64).optional(),
        allergies: z.string().max(2047).optional(),
        conditions: z.string().max(2047).optional(),
        bloodType: z.string().max(8).optional(),
        height: z.string().max(32).optional(),
        weight: z.string().max(32).optional(),
        emergency: z
          .object({
            name: z.string().max(255).optional(),
            relationship: z.string().max(255).optional(),
            phone: z.string().max(64).optional(),
          })
          .partial()
          .optional(),
      })
      .partial()
      .optional(),
  })
  .strict()

function readSettings(user: UserRow | null): SettingsData {
  const raw = (user?.oauthData as { settings?: unknown } | null)?.settings
  if (!raw || typeof raw !== 'object') return structuredClone(DEFAULT_SETTINGS)
  const saved = raw as Partial<SettingsData>
  return {
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(saved.notifications ?? {}) },
    pharmacy: { ...DEFAULT_SETTINGS.pharmacy, ...(saved.pharmacy ?? {}) },
    appearance: {
      ...DEFAULT_SETTINGS.appearance,
      ...(saved.appearance ?? {}),
      timeFormat: saved.appearance?.timeFormat === '24h' ? '24h' : '12h',
    },
  }
}

/** The Profile page's medical/emergency slice, as stored. */
function readProfile(user: UserRow | null): Record<string, unknown> {
  const raw = (user?.oauthData as { profile?: unknown } | null)?.profile
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
}

async function loadUser(userId: string): Promise<UserRow | null> {
  return findById<UserRow>('users', userId)
}

router.get('/me', async (_req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const user = await loadUser(userId)
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }
    res.json({ settings: readSettings(user), profile: readProfile(user) })
  } catch (err) {
    logger.error(`settings.me read failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/me', validateBody(settingsPatchSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const patch = req.body as z.infer<typeof settingsPatchSchema>

    const existing = await loadUser(userId)
    if (!existing) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }

    // Merge the slice server-side so a partial PATCH (e.g. appearance only)
    // never clobbers the other sections.
    const merged = readSettings(existing)
    if (patch.notifications)
      merged.notifications = { ...merged.notifications, ...patch.notifications }
    if (patch.pharmacy) merged.pharmacy = { ...merged.pharmacy, ...patch.pharmacy }
    if (patch.appearance) merged.appearance = { ...merged.appearance, ...patch.appearance }

    const oauth = (existing.oauthData ?? {}) as Record<string, unknown>
    const nextOauth: Record<string, unknown> = { ...oauth, settings: merged }
    if (patch.profile) {
      const current = readProfile(existing)
      const { emergency, ...rest } = patch.profile
      const currentEmergency = (current.emergency ?? {}) as Record<string, unknown>
      nextOauth.profile = {
        ...current,
        ...rest,
        emergency: { ...currentEmergency, ...(emergency ?? {}) },
      }
    }

    await query(`UPDATE public.users SET "oauthData" = $1::jsonb, "updatedAt" = $2 WHERE id = $3`, [
      JSON.stringify(nextOauth),
      new Date(),
      userId,
    ])

    res.json({ settings: merged, profile: readProfile({ id: userId, oauthData: nextOauth }) })
  } catch (err) {
    logger.error(`settings.me update failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
