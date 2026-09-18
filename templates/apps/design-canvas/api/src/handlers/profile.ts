/**
 * Profile — aggregates the user's identity + workspace stats and exposes
 * a PATCH for editable fields backed by `users.oauthData.dc`.
 *
 * - GET   /profile/me       — user + project/notification/template counts
 * - PATCH /profile/me       — update displayName, bio, location, etc.
 *
 * The `oauthData.dc` (design-canvas) blob is the per-app preference
 * bag kept on the existing `users.oauthData` jsonb column, which means
 * no migration is needed when settings shift.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findById, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUser } from './_seed.js'

const router = Router()

interface DesignCanvasProfilePrefs {
  displayName?: string
  bio?: string
  location?: string
  pronouns?: string
  publicUrl?: string
  cursorColor?: string
  theme?: string
  notifyMentions?: boolean
  notifyInvites?: boolean
  notifyComments?: boolean
  notifyDigest?: boolean
}

interface OAuthData {
  dc?: DesignCanvasProfilePrefs
  [k: string]: unknown
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<Record<string, unknown>>('users', userId)
  if (!user) {
    res.status(404).json({ error: t('users.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  // First-touch demo seed: starter project + welcome notifications.
  // Idempotent — re-running for the same user is a no-op.
  await seedDemoForUser(userId).catch(() => {
    /* best-effort */
  })

  const oauthData = (user.oauthData ?? {}) as OAuthData
  const prefs = oauthData.dc ?? {}

  const [projects, notifications, templatesUsed, exports_] = await Promise.all([
    count('projects', [{ field: 'user_id', operator: '=', value: userId }]),
    count('notifications', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'unread', operator: '=', value: true },
    ]).catch(() => 0),
    count('shapes', [{ field: 'user_id', operator: '=', value: userId }]).catch(() => 0),
    count('exports', [{ field: 'user_id', operator: '=', value: userId }]).catch(() => 0),
  ])

  res.json({
    id: userId,
    name: user.name ?? null,
    email: user.email ?? null,
    username: user.username ?? null,
    planKey: user.planKey ?? 'free',
    prefs,
    stats: {
      projects,
      shapes: templatesUsed,
      exports: exports_,
      unreadNotifications: notifications,
    },
  })
})

const updateSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    prefs: z
      .object({
        displayName: z.string().max(120).optional(),
        bio: z.string().max(500).optional(),
        location: z.string().max(120).optional(),
        pronouns: z.string().max(40).optional(),
        publicUrl: z.string().max(200).optional(),
        cursorColor: z.string().max(20).optional(),
        theme: z.enum(['light', 'dark', 'system']).optional(),
        notifyMentions: z.boolean().optional(),
        notifyInvites: z.boolean().optional(),
        notifyComments: z.boolean().optional(),
        notifyDigest: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((v) => v.name !== undefined || v.prefs !== undefined, {
    message: 'Provide at least one of name or prefs',
  })

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const body = req.body as z.infer<typeof updateSchema>

  // Update name + merge prefs in a single SQL statement so concurrent
  // patches don't clobber each other's keys.
  if (body.prefs !== undefined) {
    await query(
      `UPDATE users
       SET "oauthData" = jsonb_set(
             COALESCE("oauthData", '{}'::jsonb),
             '{dc}',
             COALESCE("oauthData"->'dc', '{}'::jsonb) || $2::jsonb,
             true
           ),
           "updatedAt" = now()
       WHERE id = $1::uuid`,
      [userId, JSON.stringify(body.prefs)],
    )
  }
  if (body.name !== undefined) {
    await query(`UPDATE users SET name = $2, "updatedAt" = now() WHERE id = $1::uuid`, [
      userId,
      body.name,
    ])
  }

  const user = await findById<Record<string, unknown>>('users', userId)
  const oauthData = (user?.oauthData ?? {}) as OAuthData
  res.json({
    id: userId,
    name: user?.name ?? null,
    email: user?.email ?? null,
    username: user?.username ?? null,
    planKey: user?.planKey ?? 'free',
    prefs: oauthData.dc ?? {},
  })
})

export default router
