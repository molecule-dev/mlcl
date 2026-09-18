// Per-app /users/me/* convenience routes.
//
// The molecule user resource exposes PATCH /api/users/:id (auth-self), but
// the helpdesk Settings page needs separate save buttons for profile,
// notification preferences, and appearance — each of which should round
// trip through reload. Rather than fan that out into multiple PATCH
// /users/:id calls (and rebuild the request body in the client), we
// expose a small per-app surface that maps cleanly onto the page:
//
//   GET  /users/me                          — current user + helpdesk preferences
//   PUT  /users/me                          — name + profile {jobTitle, timezone}
//   PUT  /users/me/notification-preferences — email/push toggles + digest
//   PUT  /users/me/preferences              — theme/language/compactMode
//   PUT  /users/me/deactivate               — flag the account deactivated
//
// All three persistent payloads land inside the user's `oauthData` jsonb
// column (the canonical Molecule freeform metadata field) so they survive
// reload and a logout/login round trip without a schema migration.

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  email: string | null
  name: string | null
  oauthData: Record<string, unknown> | null
  planKey: string | null
  twoFactorEnabled: boolean | null
}

interface HelpdeskPreferences {
  profile?: {
    jobTitle?: string | null
    timezone?: string | null
  }
  notification_preferences?: {
    newTicketsEmail?: boolean
    dailySummaryEmail?: boolean
    mentionsEmail?: boolean
    urgentPush?: boolean
    slaBreachPush?: boolean
    digestFrequency?: string
  }
  preferences?: {
    theme?: 'light' | 'dark' | 'system'
    language?: string
    compactMode?: boolean
  }
  deactivated?: boolean
  deactivatedAt?: string
}

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

async function fetchUser(userId: string): Promise<UserRow | null> {
  const user = (await findById('users', userId)) as UserRow | null
  return user
}

function readPrefs(user: UserRow): HelpdeskPreferences {
  const od = (user.oauthData ?? {}) as Record<string, unknown>
  return {
    profile: (od.profile as HelpdeskPreferences['profile']) ?? {},
    notification_preferences:
      (od.notification_preferences as HelpdeskPreferences['notification_preferences']) ?? {},
    preferences: (od.preferences as HelpdeskPreferences['preferences']) ?? {},
    deactivated: Boolean(od.deactivated),
    deactivatedAt: typeof od.deactivatedAt === 'string' ? (od.deactivatedAt as string) : undefined,
  }
}

function shapeUser(user: UserRow): Record<string, unknown> {
  const prefs = readPrefs(user)
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    planKey: user.planKey,
    twoFactorEnabled: user.twoFactorEnabled === true,
    profile: prefs.profile,
    notification_preferences: prefs.notification_preferences,
    preferences: prefs.preferences,
    deactivated: prefs.deactivated,
    deactivatedAt: prefs.deactivatedAt,
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return unauthorized(res)
  const user = await fetchUser(userId)
  if (!user) {
    return res
      .status(404)
      .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
  }
  res.json(shapeUser(user))
})

const profileSchema = z.object({
  name: z.string().max(255).optional(),
  jobTitle: z.string().max(255).nullable().optional(),
  timezone: z.string().max(255).nullable().optional(),
})

router.put('/me', validateBody(profileSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return unauthorized(res)
  const user = await fetchUser(userId)
  if (!user) {
    return res
      .status(404)
      .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
  }
  const body = req.body as z.infer<typeof profileSchema>
  const next = { ...((user.oauthData ?? {}) as Record<string, unknown>) }
  const profile = { ...((next.profile as Record<string, unknown>) ?? {}) }
  if (body.jobTitle !== undefined) profile.jobTitle = body.jobTitle
  if (body.timezone !== undefined) profile.timezone = body.timezone
  next.profile = profile
  const patch: Record<string, unknown> = { oauthData: next }
  if (body.name !== undefined) patch.name = body.name
  await updateById('users', userId, patch)
  const fresh = await fetchUser(userId)
  res.json(shapeUser(fresh ?? user))
})

const notificationSchema = z.object({
  newTicketsEmail: z.boolean().optional(),
  dailySummaryEmail: z.boolean().optional(),
  mentionsEmail: z.boolean().optional(),
  urgentPush: z.boolean().optional(),
  slaBreachPush: z.boolean().optional(),
  digestFrequency: z.string().max(64).optional(),
})

router.put(
  '/me/notification-preferences',
  validateBody(notificationSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const user = await fetchUser(userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const next = { ...((user.oauthData ?? {}) as Record<string, unknown>) }
    const prev = (next.notification_preferences as Record<string, unknown>) ?? {}
    next.notification_preferences = { ...prev, ...(req.body as Record<string, unknown>) }
    await updateById('users', userId, { oauthData: next })
    const fresh = await fetchUser(userId)
    res.json(shapeUser(fresh ?? user))
  },
)

const appearanceSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  language: z.string().max(64).optional(),
  compactMode: z.boolean().optional(),
})

router.put(
  '/me/preferences',
  validateBody(appearanceSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const user = await fetchUser(userId)
    if (!user) {
      return res
        .status(404)
        .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    }
    const next = { ...((user.oauthData ?? {}) as Record<string, unknown>) }
    const prev = (next.preferences as Record<string, unknown>) ?? {}
    next.preferences = { ...prev, ...(req.body as Record<string, unknown>) }
    await updateById('users', userId, { oauthData: next })
    const fresh = await fetchUser(userId)
    res.json(shapeUser(fresh ?? user))
  },
)

router.put('/me/deactivate', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return unauthorized(res)
  const user = await fetchUser(userId)
  if (!user) {
    return res
      .status(404)
      .json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
  }
  const next = {
    ...((user.oauthData ?? {}) as Record<string, unknown>),
    deactivated: true,
    deactivatedAt: new Date().toISOString(),
  }
  await updateById('users', userId, { oauthData: next })
  res.json({ deactivated: true })
})

export default router
