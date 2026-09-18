/**
 * Profile handler — `GET /me` returns the current authenticated user's
 * editable profile fields (name, email, plan key); `PUT /me` updates
 * mutable fields. Settings + Profile pages drive their data from this so
 * we don't ship hardcoded placeholder strings.
 *
 * App-specific preferences (theme, timezone, reminder toggles, streak
 * rules) live inside `users.oauthData.ht` (a JSONB blob keyed under the
 * app's two-letter abbreviation so multiple apps can share the same user
 * row safely without colliding).
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const habitPrefsSchema = z
  .object({
    timezone: z.string().max(64).nullable().optional(),
    startOfWeek: z.enum(['sunday', 'monday']).optional(),
    freezesPerWeek: z.number().int().min(0).max(7).optional(),
    weekendsCount: z.boolean().optional(),
    gracePeriod: z.boolean().optional(),
    remindDaily: z.boolean().optional(),
    remindAtRisk: z.boolean().optional(),
    remindWeekly: z.boolean().optional(),
    remindAchievement: z.boolean().optional(),
    bio: z.string().max(2000).optional(),
  })
  .partial()

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(1023).optional(),
  username: z.string().min(1).max(255).optional(),
  preferences: habitPrefsSchema.optional(),
})

interface UserRow {
  id: string
  name: string | null
  email: string | null
  username: string | null
  planKey: string | null
  planExpiresAt: Date | null
  planAutoRenews: boolean | null
  oauthData: Record<string, unknown> | null
  createdAt: Date | string
}

const DEFAULT_PREFS = {
  timezone: null as string | null,
  startOfWeek: 'monday' as 'sunday' | 'monday',
  freezesPerWeek: 1,
  weekendsCount: true,
  gracePeriod: false,
  remindDaily: true,
  remindAtRisk: true,
  remindWeekly: true,
  remindAchievement: true,
  bio: '',
}

function readPrefs(user: UserRow): typeof DEFAULT_PREFS {
  const raw = (user.oauthData as { ht?: unknown } | null)?.ht
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS }
  return { ...DEFAULT_PREFS, ...(raw as Record<string, unknown>) } as typeof DEFAULT_PREFS
}

router.get('/me', async (_req: Request, res: Response): Promise<void> => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res.status(404).json({
      error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
    })
    return
  }
  res.json({
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    username: user.username ?? null,
    planKey: user.planKey ?? 'free',
    planExpiresAt: user.planExpiresAt ?? null,
    planAutoRenews: user.planAutoRenews ?? false,
    createdAt: user.createdAt,
    preferences: readPrefs(user),
  })
})

router.put(
  '/me',
  validateBody(updateSchema),
  async (req: Request, res: Response): Promise<void> => {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const body = req.body as z.infer<typeof updateSchema>

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
    if (body.username !== undefined) {
      args.push(body.username)
      setClauses.push(`username = $${args.length}`)
    }

    if (body.preferences) {
      const existing = await findById<UserRow>('users', userId)
      const current = readPrefs(existing ?? ({} as UserRow))
      const merged = { ...current, ...body.preferences }
      const oauth = (existing?.oauthData ?? {}) as Record<string, unknown>
      const next = { ...oauth, ht: merged }
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
    const user = await findById<UserRow>('users', userId)
    if (!user) {
      res.status(404).json({
        error: t('users.notFound', undefined, { defaultValue: 'User not found.' }),
      })
      return
    }
    res.json({
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      username: user.username ?? null,
      planKey: user.planKey ?? 'free',
      planExpiresAt: user.planExpiresAt ?? null,
      planAutoRenews: user.planAutoRenews ?? false,
      createdAt: user.createdAt,
      preferences: readPrefs(user),
    })
  },
)

export default router
