/**
 * Settings handler — preferences + integration connections.
 *
 * Persists per-user settings in `user_settings` (one row per user, lazily
 * created on first PATCH). Powers the Settings → Integrations tab and
 * any future preference toggles.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface SettingsRow {
  user_id?: string
  organization?: string | null
  preferences?: Record<string, unknown> | string | null
  integrations?: Record<string, unknown> | string | null
  updated_at?: string | Date | null
}

const DEFAULT_INTEGRATIONS = {
  snowflake: 'available',
  bigquery: 'available',
  redshift: 'available',
  postgres: 'available',
  s3_parquet: 'available',
} as const

type IntegrationStatus = 'available' | 'connected'

function decodeJson<T>(v: unknown, fallback: T): T {
  if (!v) return fallback
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as T
    } catch (_error) {
      // Malformed JSON string — return the fallback value
      return fallback
    }
  }
  if (typeof v === 'object') return v as T
  return fallback
}

function shapeSettings(row: SettingsRow | null): Record<string, unknown> {
  const integrations = decodeJson<Record<string, IntegrationStatus>>(row?.integrations, {})
  const merged: Record<string, IntegrationStatus> = { ...DEFAULT_INTEGRATIONS }
  for (const [k, v] of Object.entries(integrations)) {
    if (v === 'connected' || v === 'available') merged[k] = v
  }
  return {
    organization: row?.organization ?? '',
    preferences: decodeJson<Record<string, unknown>>(row?.preferences, {}),
    integrations: merged,
    updated_at: row?.updated_at ?? null,
  }
}

async function readSettings(userId: string): Promise<SettingsRow | null> {
  return await findOne<SettingsRow>('user_settings', [
    { field: 'user_id', operator: '=', value: userId },
  ])
}

async function ensureSettings(userId: string): Promise<SettingsRow> {
  const existing = await readSettings(userId)
  if (existing) return existing
  await create('user_settings', {
    user_id: userId,
    organization: '',
    preferences: JSON.stringify({}),
    integrations: JSON.stringify({}),
  })
  return (await readSettings(userId)) ?? { user_id: userId }
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const row = await readSettings(userId)
  res.json(shapeSettings(row))
})

const patchSchema = z.object({
  organization: z.string().max(255).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
  integrations: z.record(z.string(), z.enum(['available', 'connected'])).optional(),
})

router.patch('/', validateBody(patchSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  const body = req.body as z.infer<typeof patchSchema>
  await ensureSettings(userId)
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (typeof body.organization === 'string') updates.organization = body.organization
  if (body.preferences !== undefined) updates.preferences = JSON.stringify(body.preferences)
  if (body.integrations !== undefined) updates.integrations = JSON.stringify(body.integrations)
  // user_settings PK is user_id (not id) — use updateMany.
  await updateMany('user_settings', [{ field: 'user_id', operator: '=', value: userId }], updates)
  const fresh = await readSettings(userId)
  res.json(shapeSettings(fresh))
})

const integrationSchema = z.object({
  status: z.enum(['available', 'connected']),
})

router.put(
  '/integrations/:source',
  validateBody(integrationSchema),
  async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const source = String(req.params.source ?? '').slice(0, 64)
    if (!source)
      return res.status(400).json({
        error: t('settings.integrations.missingSource', {}, { defaultValue: 'Missing source' }),
      })
    const body = req.body as z.infer<typeof integrationSchema>
    const settings = await ensureSettings(userId)
    const integrations = decodeJson<Record<string, IntegrationStatus>>(settings.integrations, {})
    integrations[source] = body.status
    await updateMany('user_settings', [{ field: 'user_id', operator: '=', value: userId }], {
      integrations: JSON.stringify(integrations),
      updated_at: new Date(),
    })
    const fresh = await readSettings(userId)
    res.json(shapeSettings(fresh))
  },
)

export default router
