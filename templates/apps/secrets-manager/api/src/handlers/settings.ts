/**
 * Settings channel — `GET /api/settings/me` + `PATCH /api/settings/me`.
 *
 * The Settings page's Organisation panel drives its data from here. The
 * platform user resource NEVER returns `oauthData` on reads
 * (`stripSensitiveUserColumns` removes it — it is a denylist that includes
 * real OAuth material), so anything persisted through `PATCH /api/users/:id`
 * inside `oauthData` silently evaporates on the next `GET /users/me`. This
 * channel reads and merges the app's slice SERVER-SIDE instead, so
 * preferences survive a reload.
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

/** Mirrors the Settings page's org slice (defaults included). */
const DEFAULT_SETTINGS = {
  org: {
    name: '',
  },
}

type SettingsData = typeof DEFAULT_SETTINGS

const settingsPatchSchema = z
  .object({
    org: z
      .object({
        name: z.string().max(255).optional(),
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
    org: { ...DEFAULT_SETTINGS.org, ...(saved.org ?? {}) },
  }
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
    res.json({ settings: readSettings(user) })
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

    // Merge the slice server-side so a partial PATCH never clobbers
    // unknown keys already stored in the oauthData bag.
    const merged = readSettings(existing)
    if (patch.org) merged.org = { ...merged.org, ...patch.org }

    const oauth = (existing.oauthData ?? {}) as Record<string, unknown>
    const nextOauth: Record<string, unknown> = { ...oauth, settings: merged }

    await query(`UPDATE public.users SET "oauthData" = $1::jsonb, "updatedAt" = $2 WHERE id = $3`, [
      JSON.stringify(nextOauth),
      new Date(),
      userId,
    ])

    res.json({ settings: merged })
  } catch (err) {
    logger.error(`settings.me update failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
