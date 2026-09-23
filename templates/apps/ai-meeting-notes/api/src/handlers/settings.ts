/**
 * Settings channel — `GET /api/settings/me` + `PATCH /api/settings/me`.
 *
 * The Profile, Settings, and Integrations pages drive their persisted state
 * from here. The platform user resource NEVER returns `oauthData` on reads,
 * so anything written through PATCH /api/users/:id inside `oauthData`
 * silently evaporates on the next GET — this channel reads and merges the
 * app's slices SERVER-SIDE instead (the fleet pattern: see food-delivery's
 * handlers/settings.ts).
 *
 * App-specific slices live inside `users.oauthData` under `profile`,
 * `settings`, and `integrations`. A partial PATCH merges each provided slice
 * over the stored one (shallow within the slice) so callers never clobber
 * slices they did not send.
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
  name: string | null
  email: string | null
  oauthData: Record<string, unknown> | null
}

type ProfileSlice = Record<string, unknown>
type SettingsSlice = Record<string, unknown>
type IntegrationsSlice = Record<string, { connected: boolean; connectedAt?: string }>

const profileSchema = z
  .object({
    displayName: z.string().max(255).optional(),
    bio: z.string().max(2000).optional(),
    speakerColor: z.number().int().min(1).max(5).optional(),
    timezone: z.string().max(64).optional(),
    jobTitle: z.string().max(255).optional(),
    notifyMentions: z.boolean().optional(),
    notifyAssignments: z.boolean().optional(),
    notifySummaries: z.boolean().optional(),
  })
  .strict()

const settingsSchema = z
  .object({
    transcription: z
      .object({
        language: z.string().max(64).optional(),
        speakers: z.string().max(64).optional(),
        profanity: z.string().max(64).optional(),
      })
      .optional(),
    sharing: z
      .object({
        scope: z.string().max(64).optional(),
        exportFormat: z.string().max(64).optional(),
      })
      .optional(),
    retention: z
      .object({
        audio: z.string().max(64).optional(),
        transcript: z.string().max(64).optional(),
      })
      .optional(),
  })
  .strict()

const integrationsSchema = z.record(
  z.string().max(64),
  z.object({
    connected: z.boolean(),
    connectedAt: z.string().max(64).optional(),
  }),
)

const updateSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    profile: profileSchema.optional(),
    settings: settingsSchema.optional(),
    integrations: integrationsSchema.optional(),
  })
  .strict()

function slicesOf(user: UserRow | null): {
  profile: ProfileSlice
  settings: SettingsSlice
  integrations: IntegrationsSlice
} {
  const raw = (user?.oauthData ?? {}) as {
    profile?: unknown
    settings?: unknown
    integrations?: unknown
  }
  return {
    profile: isObject(raw.profile) ? raw.profile : {},
    settings: isObject(raw.settings) ? raw.settings : {},
    integrations: isObject(raw.integrations) ? (raw.integrations as IntegrationsSlice) : {},
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
    const slices = slicesOf(user)
    res.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      profile: slices.profile,
      settings: slices.settings,
      integrations: slices.integrations,
    })
  } catch (err) {
    logger.error(`settings.me read failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>

    const existing = await loadUser(userId)
    if (!existing) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }

    const setClauses: string[] = []
    const args: unknown[] = []

    if (body.name !== undefined) {
      args.push(body.name)
      setClauses.push(`name = $${args.length}`)
    }

    // Merge each provided slice over the stored one SERVER-SIDE so a partial
    // PATCH (profile only, or a single integration toggle) never clobbers the
    // other slices — and never the fields of its own slice it did not send.
    if (
      body.profile !== undefined ||
      body.settings !== undefined ||
      body.integrations !== undefined
    ) {
      const current = slicesOf(existing)
      const merged = {
        profile: { ...current.profile, ...(body.profile ?? {}) },
        settings: { ...current.settings, ...(body.settings ?? {}) },
        integrations: { ...current.integrations, ...(body.integrations ?? {}) },
      }
      const oauth = (existing.oauthData ?? {}) as Record<string, unknown>
      const next = { ...oauth, ...merged }
      args.push(JSON.stringify(next))
      setClauses.push(`"oauthData" = $${args.length}::jsonb`)
    }

    if (setClauses.length === 0) {
      res.status(400).json({
        error: t('users.noFields', undefined, { defaultValue: 'Nothing to update.' }),
      })
      return
    }

    args.push(new Date())
    setClauses.push(`"updatedAt" = $${args.length}`)
    args.push(userId)

    await query(`UPDATE public.users SET ${setClauses.join(', ')} WHERE id = $${args.length}`, args)

    const user = await loadUser(userId)
    const slices = slicesOf(user)
    res.json({
      id: userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      profile: slices.profile,
      settings: slices.settings,
      integrations: slices.integrations,
    })
  } catch (err) {
    logger.error(`settings.me update failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
