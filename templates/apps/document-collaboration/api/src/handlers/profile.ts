/**
 * Profile handlers — GET/PATCH /profile/me.
 *
 * The user's signed-in identity (display_name, handle, pronouns, role,
 * location, bio, cursor color, public toggle, editor preferences) is
 * stored in users.oauthData.dc so we don't need to add per-app columns.
 * The handler reads/writes the dc sub-object and returns a flat shape
 * the frontend can spread directly into form state.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import { internalError, requireUser, validationError } from '../lib/authz.js'

const router = Router()

interface UserRow {
  id: string
  name?: string | null
  username?: string | null
  email?: string | null
  oauthData?: Record<string, unknown> | null
}

const updateSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  handle: z.string().min(1).max(64).nullable().optional(),
  pronouns: z.string().max(64).nullable().optional(),
  role: z.string().max(255).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  cursor_color: z
    .string()
    .regex(/^#[0-9a-fA-F]{3,8}$/)
    .nullable()
    .optional(),
  public_profile: z.boolean().optional(),
  editor_prefs: z.record(z.string(), z.boolean()).optional(),
  notification_prefs: z.record(z.string(), z.boolean()).optional(),
})

const DEFAULT_NOTIFICATION_PREFS = {
  comments: true,
  mentions: true,
  sharing: true,
  suggestions: false,
  digest: true,
}

const DEFAULT_EDITOR_PREFS = {
  serif: true,
  spellcheck: true,
  'smart-quotes': true,
  autosave: true,
  'focus-mode': false,
}

const DEFAULT_CURSOR_COLOR = '#4f46e5'

interface ProfileExt {
  display_name?: string
  handle?: string | null
  pronouns?: string | null
  role?: string | null
  location?: string | null
  bio?: string | null
  cursor_color?: string | null
  public_profile?: boolean
  editor_prefs?: Record<string, boolean>
  notification_prefs?: Record<string, boolean>
}

const readExt = (user: UserRow | null): ProfileExt => {
  const oauth = (user?.oauthData as Record<string, unknown> | null) ?? {}
  const dc = oauth.dc as ProfileExt | undefined
  return dc ?? {}
}

const projectProfile = (user: UserRow | null): Record<string, unknown> => {
  const ext = readExt(user)
  const display = ext.display_name ?? user?.name ?? user?.username ?? user?.email ?? ''
  const handle = ext.handle ?? user?.username ?? null
  return {
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    display_name: display,
    handle,
    pronouns: ext.pronouns ?? null,
    role: ext.role ?? null,
    location: ext.location ?? null,
    bio: ext.bio ?? null,
    cursor_color: ext.cursor_color ?? DEFAULT_CURSOR_COLOR,
    public_profile: ext.public_profile ?? true,
    editor_prefs: { ...DEFAULT_EDITOR_PREFS, ...(ext.editor_prefs ?? {}) },
    notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(ext.notification_prefs ?? {}) },
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  try {
    const user = await findById<UserRow>('users', ownerId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
      return
    }
    res.json(projectProfile(user))
  } catch (error) {
    logger.error('profile.get', error)
    internalError(res)
  }
})

router.patch('/me', async (req: Request, res: Response) => {
  const ownerId = requireUser(res)
  if (!ownerId) return
  const body = updateSchema.safeParse(req.body)
  if (!body.success) {
    validationError(res, body.error.issues)
    return
  }
  try {
    const user = await findById<UserRow>('users', ownerId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
      return
    }
    const oauth = (user.oauthData as Record<string, unknown> | null) ?? {}
    const ext = (oauth.dc as ProfileExt | undefined) ?? {}
    const merged: ProfileExt = { ...ext }
    const updates: Record<string, unknown> = {}

    if (body.data.display_name !== undefined) {
      merged.display_name = body.data.display_name
      updates.name = body.data.display_name
    }
    if (body.data.handle !== undefined) {
      merged.handle = body.data.handle
    }
    for (const k of [
      'pronouns',
      'role',
      'location',
      'bio',
      'cursor_color',
      'public_profile',
    ] as const) {
      if (body.data[k] !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(merged as any)[k] = body.data[k]
      }
    }
    if (body.data.editor_prefs) {
      merged.editor_prefs = { ...(merged.editor_prefs ?? {}), ...body.data.editor_prefs }
    }
    if (body.data.notification_prefs) {
      merged.notification_prefs = {
        ...(merged.notification_prefs ?? {}),
        ...body.data.notification_prefs,
      }
    }

    updates.oauthData = { ...oauth, dc: merged }
    await updateById('users', ownerId, updates)
    const fresh = await findById<UserRow>('users', ownerId)
    res.json(projectProfile(fresh ?? user))
  } catch (error) {
    logger.error('profile.update', error)
    internalError(res)
  }
})

export default router
