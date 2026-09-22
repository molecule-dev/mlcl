/**
 * log-viewer — per-user preferences (GET/PATCH /api/preferences).
 *
 * The shared `users` row is owned by @molecule/api-resource-user and its
 * read shape NEVER returns `oauthData`, so anything the Settings page
 * persisted there silently reset on every reload. This handler is the
 * app's own server-side channel: preferences live in the
 * `user_preferences` table (0011_user_preferences.sql) and round-trip
 * through this router.
 *
 * GET   /api/preferences → row for the signed-in user (auto-created with
 *                          defaults if missing)
 * PATCH /api/preferences → merge a subset of fields, returns the full row
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

import { route } from './_http.js'

const router = Router()

interface PreferencesRow {
  user_id: string
  hot_retention_days: number
  cold_retention_days: number
  updated_at?: Date | string
}

const updatePreferencesSchema = z.object({
  hot_retention_days: z.number().int().min(1).max(3650).optional(),
  cold_retention_days: z.number().int().min(1).max(3650).optional(),
})

async function loadOrCreatePreferences(userId: string): Promise<PreferencesRow> {
  const existing = await findOne<PreferencesRow>('user_preferences', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const created = await create<PreferencesRow>('user_preferences', {
    user_id: userId,
    hot_retention_days: 30,
    cold_retention_days: 365,
  })
  return ((created as { data?: PreferencesRow }).data ?? created) as PreferencesRow
}

router.get(
  '/',
  route('preferences.load', async (_req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    const row = await loadOrCreatePreferences(userId)
    res.json(row)
  }),
)

router.patch(
  '/',
  validateBody(updatePreferencesSchema),
  route('preferences.update', async (req: Request, res: Response) => {
    const userId = getUserId(res)
    if (!userId) {
      res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
      return
    }
    await loadOrCreatePreferences(userId)
    const updates = { ...(req.body as Record<string, unknown>), updated_at: new Date() }
    await updateMany(
      'user_preferences',
      [{ field: 'user_id', operator: '=', value: userId }],
      updates,
    )
    const fresh = await findOne<PreferencesRow>('user_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(fresh ?? updates)
  }),
)

export default router
