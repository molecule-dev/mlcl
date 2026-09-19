/**
 * Profile handler — GET/PATCH /profile/me.
 *
 * Per-app profile extensions (handle, role, location, bio, on-call slot,
 * notification + editor prefs) live under `users.oauthData.et` so we
 * don't need a per-app users-extension table. Returns a flat shape the
 * Profile page can spread into form state.
 *
 * @module
 */

import crypto from 'node:crypto'

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, deleteById, findById, findMany, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface UserRow {
  id: string
  name?: string | null
  username?: string | null
  email?: string | null
  oauthData?: Record<string, unknown> | null
}

interface ProfileExt {
  display_name?: string
  handle?: string | null
  role?: string | null
  location?: string | null
  bio?: string | null
  timezone?: string | null
  oncall?: boolean
  notification_prefs?: Record<string, boolean>
  alert_prefs?: Record<string, boolean>
}

const DEFAULT_NOTIFICATION_PREFS = {
  assignment: true,
  mention: true,
  alert: true,
  regression: true,
  digest: true,
}
const DEFAULT_ALERT_PREFS = {
  email: true,
  slack: false,
  push: false,
}

const updateSchema = z.object({
  display_name: z.string().min(1).max(255).optional(),
  handle: z.string().min(1).max(64).nullable().optional(),
  role: z.string().max(255).nullable().optional(),
  location: z.string().max(255).nullable().optional(),
  bio: z.string().max(2000).nullable().optional(),
  timezone: z.string().max(64).nullable().optional(),
  oncall: z.boolean().optional(),
  notification_prefs: z.record(z.string(), z.boolean()).optional(),
  alert_prefs: z.record(z.string(), z.boolean()).optional(),
})

const readExt = (user: UserRow | null): ProfileExt => {
  const oauth = (user?.oauthData as Record<string, unknown> | null) ?? {}
  return (oauth.et as ProfileExt | undefined) ?? {}
}

const projectProfile = (user: UserRow | null): Record<string, unknown> => {
  const ext = readExt(user)
  const display = ext.display_name ?? user?.name ?? user?.username ?? user?.email ?? ''
  return {
    user_id: user?.id ?? null,
    email: user?.email ?? null,
    display_name: display,
    handle: ext.handle ?? user?.username ?? null,
    role: ext.role ?? null,
    location: ext.location ?? null,
    bio: ext.bio ?? null,
    timezone: ext.timezone ?? 'UTC',
    oncall: ext.oncall ?? false,
    notification_prefs: { ...DEFAULT_NOTIFICATION_PREFS, ...(ext.notification_prefs ?? {}) },
    alert_prefs: { ...DEFAULT_ALERT_PREFS, ...(ext.alert_prefs ?? {}) },
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
    return
  }
  res.json(projectProfile(user))
})

router.patch('/me', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({ error: t('auth.unauthorized') })
    return
  }
  const parsed = updateSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', issues: parsed.error.issues })
    return
  }
  const user = await findById<UserRow>('users', userId)
  if (!user) {
    res
      .status(404)
      .json({ error: t('profile.notFound', {}, { defaultValue: 'Profile not found' }) })
    return
  }
  const oauth = (user.oauthData as Record<string, unknown> | null) ?? {}
  const ext = (oauth.et as ProfileExt | undefined) ?? {}
  const merged: ProfileExt = { ...ext }
  const updates: Record<string, unknown> = {}

  if (parsed.data.display_name !== undefined) {
    merged.display_name = parsed.data.display_name
    updates.name = parsed.data.display_name
  }
  for (const k of ['handle', 'role', 'location', 'bio', 'timezone', 'oncall'] as const) {
    if (parsed.data[k] !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(merged as any)[k] = parsed.data[k]
    }
  }
  if (parsed.data.notification_prefs) {
    merged.notification_prefs = {
      ...(merged.notification_prefs ?? {}),
      ...parsed.data.notification_prefs,
    }
  }
  if (parsed.data.alert_prefs) {
    merged.alert_prefs = { ...(merged.alert_prefs ?? {}), ...parsed.data.alert_prefs }
  }

  updates.oauthData = { ...oauth, et: merged }
  await updateById('users', userId, updates)
  const fresh = await findById<UserRow>('users', userId)
  res.json(projectProfile(fresh ?? user))
})

// ---------------------------------------------------------------------------
// Personal API keys
// ---------------------------------------------------------------------------
//
// The Profile page shows a list of personal API keys (CLI tokens, ingest
// tokens, etc). We store the prefix only (the first 16 chars of the random
// token) so the page can display "fx_pkr_8a7f3d2c" as a human marker, plus
// the last-used timestamp. The full secret is returned exactly once at
// creation time so the user can copy it; the DB never stores the full
// secret. Re-display is impossible by design.

const apiKeyCreateSchema = z.object({
  name: z.string().min(1).max(255),
  kind: z.enum(['personal', 'ingest']).optional(),
})

interface ApiKeyRow {
  id: string
  user_id: string
  name: string
  prefix: string
  last_used_at?: string | Date | null
  last_used_label?: string | null
  created_at?: string | Date | null
  revoked_at?: string | Date | null
}

router.get('/api-keys', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const rows = await findMany<ApiKeyRow>('user_api_keys', {
    where: [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'revoked_at', operator: 'is_null' },
    ],
    orderBy: [{ field: 'created_at', direction: 'desc' }],
    limit: 100,
  })
  res.json(rows)
})

router.post('/api-keys', validateBody(apiKeyCreateSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof apiKeyCreateSchema>
  const kind = body.kind ?? 'personal'
  const prefix = `fx_${kind === 'ingest' ? 'ing' : 'pkr'}_${crypto.randomBytes(4).toString('hex')}`
  const secret = `${prefix}_${crypto.randomBytes(24).toString('hex')}`
  const result = await create<ApiKeyRow>('user_api_keys', {
    user_id: userId,
    name: body.name,
    prefix,
    last_used_label: 'never',
    created_at: new Date(),
  })
  res.status(201).json({ ...result.data, secret })
})

router.delete('/api-keys/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  const row = await findById<ApiKeyRow>('user_api_keys', id)
  if (!row || row.user_id !== userId) {
    return res
      .status(404)
      .json({ error: t('profile.apiKeyNotFound', {}, { defaultValue: 'API key not found' }) })
  }
  await deleteById('user_api_keys', id)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Active sessions
// ---------------------------------------------------------------------------
//
// We surface the user's known devices via the existing `devices` table.
// `is_current` is computed by matching the request's device-id (the JWT
// stores it in the session payload as `deviceId`). Revoking a session
// deletes the device row, which forces the device to re-authenticate.

interface SessionRow {
  id: string
  user_id: string
  user_agent: string
  ip_address?: string | null
  city?: string | null
  is_current?: boolean
  last_seen_at?: string | Date | null
  created_at?: string | Date | null
}

const projectSession = (
  s: Record<string, unknown>,
  currentDeviceId: string | null,
): Record<string, unknown> => {
  const id = String(s.id)
  return {
    id,
    user_agent: String(s.user_agent ?? s.name ?? ''),
    ip_address: s.ip_address ?? null,
    city: s.city ?? null,
    is_current: id === currentDeviceId,
    last_seen_at: s.last_seen_at ?? s.lastSeenAt ?? s.updatedAt ?? null,
    created_at: s.created_at ?? s.createdAt ?? null,
  }
}

router.get('/sessions', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const session = res.locals.session as { deviceId?: string } | undefined
  const currentDeviceId = session?.deviceId ?? null
  // Prefer the curated user_sessions_view rows seeded for the demo. If
  // none exist, fall back to the devices table so the page still has rows
  // to render after sign-up.
  const fromView = await findMany<Record<string, unknown>>('user_sessions_view', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'last_seen_at', direction: 'desc' }],
    limit: 50,
  })
  if (fromView.length > 0) {
    res.json(fromView.map((s) => projectSession(s, currentDeviceId)))
    return
  }
  const fromDevices = await findMany<Record<string, unknown>>('devices', {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [{ field: 'updatedAt', direction: 'desc' }],
    limit: 50,
  })
  res.json(fromDevices.map((d) => projectSession(d, currentDeviceId)))
})

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
  // Try user_sessions_view first, then devices.
  const viewRow = await findById<SessionRow>('user_sessions_view', id)
  if (viewRow) {
    if (viewRow.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('profile.sessionNotFound', {}, { defaultValue: 'Session not found' }) })
    }
    await deleteById('user_sessions_view', id)
    return res.status(204).end()
  }
  const deviceRow = await findById<Record<string, unknown>>('devices', id)
  if (!deviceRow || deviceRow.userId !== userId) {
    return res
      .status(404)
      .json({ error: t('profile.sessionNotFound', {}, { defaultValue: 'Session not found' }) })
  }
  await deleteById('devices', id)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Connected accounts (OAuth providers)
// ---------------------------------------------------------------------------

interface ConnectedAccountRow {
  id: string
  user_id: string
  provider: string
  provider_username?: string | null
  connected: boolean
  connected_at?: string | Date | null
}

const connectSchema = z.object({
  provider: z.string().min(1),
  provider_username: z.string().max(255).optional(),
  connected: z.boolean(),
})

router.get('/connected-accounts', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const rows = await findMany<ConnectedAccountRow>('connected_accounts', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    orderBy: [{ field: 'provider', direction: 'asc' }],
    limit: 50,
  })
  res.json(rows)
})

router.put(
  '/connected-accounts',
  validateBody(connectSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const body = req.body as z.infer<typeof connectSchema>
    // upsert by (user_id, provider)
    const existing = await findOne<ConnectedAccountRow>('connected_accounts', [
      { field: 'user_id', operator: '=', value: userId },
      { field: 'provider', operator: '=', value: body.provider },
    ])
    if (existing) {
      const updated = await updateById('connected_accounts', existing.id, {
        provider_username: body.provider_username ?? existing.provider_username,
        connected: body.connected,
        connected_at: body.connected ? new Date() : null,
      })
      res.json(updated.data)
      return
    }
    const result = await create<ConnectedAccountRow>('connected_accounts', {
      user_id: userId,
      provider: body.provider,
      provider_username: body.provider_username ?? null,
      connected: body.connected,
      connected_at: body.connected ? new Date() : null,
    })
    res.status(201).json(result.data)
  },
)

export default router
