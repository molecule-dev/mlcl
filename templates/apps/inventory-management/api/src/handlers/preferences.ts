/**
 * Per-user app preferences for inventory-management.
 *
 * The shared `users` row is owned by the platform user resource, which never
 * returns app-specific `oauthData` on reads. Preferences that must survive a
 * reload (default warehouse, integration link states) are therefore stored in
 * our own `user_preferences` table and served through this server-side
 * channel — the client never round-trips them through PATCH /users/:id.
 *
 * Endpoints (both operate on the signed-in user's row, auto-created):
 *   GET   /api/preferences  → the preference object (`{}` when unset)
 *   PATCH /api/preferences  → merge the given keys into the stored object,
 *                             returns the full updated object
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface PreferencesRow {
  id: string
  user_id: string
  data: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

const integrationEntrySchema = z.object({
  status: z.string().max(64).optional(),
  updated_at: z.string().max(64).optional(),
})

const patchPreferencesSchema = z.object({
  defaultWarehouseId: z.string().max(64).nullable().optional(),
  integrations: z.record(z.string().max(64), integrationEntrySchema).optional(),
})

async function loadOrCreatePreferences(userId: string): Promise<PreferencesRow> {
  const existing = await findOne<PreferencesRow>('user_preferences', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const created = await create<PreferencesRow>('user_preferences', {
    user_id: userId,
    data: {},
  })
  return created.data ?? (created as unknown as PreferencesRow)
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const row = await loadOrCreatePreferences(userId)
    res.json(row.data ?? {})
  } catch (error) {
    console.error('inventory-management.preferences.load_failed', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Failed to load preferences' }),
    })
  }
})

router.patch('/', validateBody(patchPreferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    }
    const body = req.body as z.infer<typeof patchPreferencesSchema>
    const current = (await loadOrCreatePreferences(userId)).data ?? {}
    // Merge per TOP-LEVEL key: the client owns each slice it sends (e.g. it
    // merges the full integrations map before PATCHing it).
    const merged: Record<string, unknown> = { ...current }
    if (body.defaultWarehouseId !== undefined) {
      merged.defaultWarehouseId = body.defaultWarehouseId
    }
    if (body.integrations !== undefined) {
      merged.integrations = body.integrations
    }
    await updateMany('user_preferences', [{ field: 'user_id', operator: '=', value: userId }], {
      data: merged,
      updated_at: new Date(),
    })
    res.json(merged)
  } catch (error) {
    console.error('inventory-management.preferences.save_failed', error)
    res.status(500).json({
      error: t('errors.internalServer', {}, { defaultValue: 'Failed to save preferences' }),
    })
  }
})

export default router
