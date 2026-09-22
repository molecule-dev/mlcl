/**
 * Settings channel — `GET /api/settings/me` + `PATCH /api/settings/me`.
 *
 * The Settings page's Profile (phone) and Preferences (notification
 * toggles) panels drive their data from here. The platform user resource
 * NEVER returns `oauthData` on reads, so anything persisted through
 * PATCH /api/users/:id inside `oauthData` silently evaporates on the next
 * GET — this channel reads and merges the app's slice SERVER-SIDE instead.
 *
 * App-specific fields (phone, notification preferences) live inside
 * `users.oauthData.fd` (a JSONB blob keyed under the app's two-letter
 * abbreviation so multiple apps can share the same user row safely
 * without colliding).
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

interface NotificationPreferences {
  push: boolean
  email: boolean
  sms: boolean
}

interface FoodDeliverySettings {
  phone: string
  preferences: NotificationPreferences
}

const DEFAULT_SETTINGS: FoodDeliverySettings = {
  phone: '',
  preferences: { push: true, email: true, sms: false },
}

const preferencesSchema = z
  .object({
    push: z.boolean().optional(),
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
  })
  .partial()

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(1023).optional(),
  phone: z.string().max(64).optional(),
  preferences: preferencesSchema.optional(),
})

function readSettings(user: UserRow | null): FoodDeliverySettings {
  const raw = (user?.oauthData as { fd?: unknown } | null)?.fd
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS }
  const fd = raw as Partial<FoodDeliverySettings>
  return {
    phone: typeof fd.phone === 'string' ? fd.phone : DEFAULT_SETTINGS.phone,
    preferences: { ...DEFAULT_SETTINGS.preferences, ...(fd.preferences ?? {}) },
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
    const settings = readSettings(user)
    res.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: settings.phone,
      preferences: settings.preferences,
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
    if (body.email !== undefined) {
      args.push(body.email)
      setClauses.push(`email = $${args.length}`)
    }

    // Merge the app slice server-side so a partial PATCH (preferences only,
    // or phone only) never clobbers the other fields.
    if (body.phone !== undefined || body.preferences !== undefined) {
      const current = readSettings(existing)
      const merged: FoodDeliverySettings = {
        phone: body.phone ?? current.phone,
        preferences: { ...current.preferences, ...(body.preferences ?? {}) },
      }
      const oauth = (existing.oauthData ?? {}) as Record<string, unknown>
      const next = { ...oauth, fd: merged }
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
    const settings = readSettings(user)
    res.json({
      id: userId,
      name: user?.name ?? null,
      email: user?.email ?? null,
      phone: settings.phone,
      preferences: settings.preferences,
    })
  } catch (err) {
    logger.error(`settings.me update failed: ${(err as Error)?.stack ?? err}`)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
