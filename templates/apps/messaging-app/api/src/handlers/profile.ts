/**
 * Profile + preferences for the signed-in user.
 *
 *   GET    /api/profile/me              — viewer-shaped row + linked devices
 *   PATCH  /api/profile/me              — update display name, status, phone
 *   GET    /api/profile/preferences     — JSON blob of UI preferences
 *   PUT    /api/profile/preferences     — upsert + shallow-merge prefs
 *
 * Preferences are intentionally schema-less at the DB layer — the
 * Settings UI writes whatever toggles the user flips, the consumers
 * read keys they know about. Everything is per-user (jsonb on
 * user_preferences).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findById, findMany, query, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status_text: string | null
  planKey: string | null
  last_seen_at: string | Date | null
}

interface DeviceRow {
  id: string
  name: string | null
  createdAt: string | Date
  updatedAt: string | Date
  userId: string
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('users.notFound', undefined, { defaultValue: 'User not found' }) })
    return
  }
  const devices = await findMany<DeviceRow>('devices', {
    where: [{ field: 'userId', operator: '=' as const, value: userId }],
    limit: 50,
  })
  res.json({
    id: String(user.id),
    name: user.name ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
    status_text: user.status_text ?? null,
    planKey: user.planKey ?? 'free',
    last_seen_at: user.last_seen_at ? new Date(user.last_seen_at).toISOString() : null,
    devices: devices.map((d) => ({
      id: String(d.id),
      name: d.name ?? 'Unnamed device',
      created_at: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      updated_at: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    })),
  })
})

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status_text: z.string().max(140).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
})

router.patch('/me', validateBody(patchSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as z.infer<typeof patchSchema>
  const updates: Record<string, unknown> = {}
  if (body.name !== undefined) updates.name = body.name
  if (body.status_text !== undefined) updates.status_text = body.status_text
  if (body.phone !== undefined) updates.phone = body.phone
  if (Object.keys(updates).length === 0) {
    const user = await findById<UserRow>('users', userId)
    res.json({ id: userId, ...user })
    return
  }
  await updateById('users', userId, updates)
  const user = await findById<UserRow>('users', userId)
  res.json({
    id: userId,
    name: user?.name ?? null,
    email: user?.email ?? null,
    phone: user?.phone ?? null,
    status_text: user?.status_text ?? null,
    planKey: user?.planKey ?? 'free',
  })
})

router.get('/preferences', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const rows = await findMany<{ preferences: Record<string, unknown> | string }>(
    'user_preferences',
    {
      where: [{ field: 'user_id', operator: '=' as const, value: userId }],
      limit: 1,
    },
  )
  let prefs: Record<string, unknown> = {}
  const raw = rows[0]?.preferences
  if (raw && typeof raw === 'object') prefs = raw
  else if (typeof raw === 'string') {
    try {
      prefs = JSON.parse(raw) ?? {}
    } catch (_error) {
      // preferences blob is malformed JSON — fall back to empty object
      prefs = {}
    }
  }
  res.json(prefs)
})

const prefsSchema = z.record(z.string(), z.unknown())

router.put('/preferences', validateBody(prefsSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.required', undefined, { defaultValue: 'Authentication required' }) })
    return
  }
  const body = req.body as Record<string, unknown>
  await query(
    `INSERT INTO public.user_preferences (user_id, preferences, updated_at)
     VALUES ($1::uuid, $2::jsonb, now())
     ON CONFLICT (user_id) DO UPDATE
       SET preferences = user_preferences.preferences || EXCLUDED.preferences,
           updated_at = now()`,
    [userId, JSON.stringify(body)],
  )
  const rows = await findMany<{ preferences: Record<string, unknown> | string }>(
    'user_preferences',
    {
      where: [{ field: 'user_id', operator: '=' as const, value: userId }],
      limit: 1,
    },
  )
  const raw = rows[0]?.preferences
  let prefs: Record<string, unknown> = {}
  if (raw && typeof raw === 'object') prefs = raw
  else if (typeof raw === 'string') {
    try {
      prefs = JSON.parse(raw) ?? {}
    } catch (_error) {
      // preferences blob is malformed JSON — fall back to empty object
      prefs = {}
    }
  }
  res.json(prefs)
})

export default router
