/**
 * `/api/profile/me` — read + write the signed-in user's profile.
 *
 * Wraps the canonical `users` row but presents the snake_case shape the
 * Settings/Account pages were authored against (e.g. `display_name`,
 * `phone`, `notifications` preferences).
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { parseJsonObject } from './_decorate.js'

const router = Router()

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  display_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  bio: z.string().optional(),
  notifications: z
    .object({
      email_marketing: z.boolean().optional(),
      email_booking_updates: z.boolean().optional(),
      sms_booking_updates: z.boolean().optional(),
      push_messages: z.boolean().optional(),
    })
    .partial()
    .optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
})

function decorateProfile(user: Record<string, unknown>): Record<string, unknown> {
  const oauthData = parseJsonObject<Record<string, unknown>>(user.oauthData)
  const prefs = parseJsonObject<Record<string, unknown>>(oauthData.preferences ?? {})
  const notif = parseJsonObject<Record<string, unknown>>(prefs.notifications ?? {})
  const profileExtras = parseJsonObject<Record<string, unknown>>(oauthData.profile ?? {})
  return {
    id: String(user.id),
    email: user.email ? String(user.email) : '',
    name: user.name ? String(user.name) : '',
    display_name: profileExtras.display_name
      ? String(profileExtras.display_name)
      : user.name
        ? String(user.name)
        : '',
    phone: profileExtras.phone ? String(profileExtras.phone) : '',
    city: profileExtras.city ? String(profileExtras.city) : '',
    bio: profileExtras.bio ? String(profileExtras.bio) : '',
    avatar_url: profileExtras.avatar_url
      ? String(profileExtras.avatar_url)
      : `https://picsum.photos/seed/alcove-host-${String(user.id).slice(0, 8)}/200/200`,
    plan_key: user.planKey ? String(user.planKey) : 'free',
    plan_expires_at: user.planExpiresAt ? String(user.planExpiresAt) : null,
    notifications: {
      email_marketing: Boolean(notif.email_marketing ?? true),
      email_booking_updates: Boolean(notif.email_booking_updates ?? true),
      sms_booking_updates: Boolean(notif.sms_booking_updates ?? false),
      push_messages: Boolean(notif.push_messages ?? true),
    },
    language: prefs.language ? String(prefs.language) : 'en',
    timezone: prefs.timezone ? String(prefs.timezone) : 'America/New_York',
    created_at_iso: user.createdAt ? new Date(String(user.createdAt)).toISOString() : null,
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<Record<string, unknown>>('users', userId)
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  res.json(decorateProfile(user))
})

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    return
  }
  const user = await findById<Record<string, unknown>>('users', userId)
  if (!user) {
    res.status(404).json({ error: t('user.notFound', {}, { defaultValue: 'User not found' }) })
    return
  }
  const body = req.body as z.infer<typeof updateSchema>
  const oauthData = parseJsonObject<Record<string, unknown>>(user.oauthData)
  const profileExtras = parseJsonObject<Record<string, unknown>>(oauthData.profile ?? {})
  const prefs = parseJsonObject<Record<string, unknown>>(oauthData.preferences ?? {})
  const notif = parseJsonObject<Record<string, unknown>>(prefs.notifications ?? {})

  const userUpdate: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name) userUpdate.name = body.name
  if (body.email) userUpdate.email = body.email

  let extrasChanged = false
  if (body.display_name) {
    profileExtras.display_name = body.display_name
    extrasChanged = true
  }
  if (body.phone !== undefined) {
    profileExtras.phone = body.phone
    extrasChanged = true
  }
  if (body.city !== undefined) {
    profileExtras.city = body.city
    extrasChanged = true
  }
  if (body.bio !== undefined) {
    profileExtras.bio = body.bio
    extrasChanged = true
  }
  if (body.notifications) {
    Object.assign(notif, body.notifications)
    extrasChanged = true
  }
  if (body.language) {
    prefs.language = body.language
    extrasChanged = true
  }
  if (body.timezone) {
    prefs.timezone = body.timezone
    extrasChanged = true
  }

  if (extrasChanged) {
    prefs.notifications = notif
    oauthData.profile = profileExtras
    oauthData.preferences = prefs
    userUpdate.oauthData = JSON.stringify(oauthData)
  }
  await updateById('users', userId, userUpdate)
  const fresh = await findById<Record<string, unknown>>('users', userId)
  res.json(decorateProfile(fresh ?? user))
})

export default router
