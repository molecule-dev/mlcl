/**
 * Per-user app preferences for crypto-tracker.
 *
 * The shared `users` row is owned by `@molecule/api-resource-user` and we
 * don't extend it with app-specific columns. Instead we keep crypto-
 * tracker preferences (display name, quote currency, locale, theme,
 * notification-channel toggles) in our own `user_preferences` table.
 *
 * Endpoints:
 *   GET  /api/preferences  → row for the signed-in user (auto-created
 *                            with defaults if missing)
 *   PUT  /api/preferences  → patch a subset of fields, returns the full
 *                            updated row
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

interface PreferencesRow {
  user_id: string
  display_name: string | null
  quote_currency: string
  locale: string
  refresh_seconds: number
  theme: string
  notify_email: boolean
  notify_push: boolean
  notify_sms: boolean
  created_at: Date
  updated_at: Date
}

const updatePreferencesSchema = z.object({
  display_name: z.string().max(255).optional().nullable(),
  quote_currency: z.string().max(8).optional(),
  locale: z.string().max(16).optional(),
  refresh_seconds: z.coerce.number().int().min(5).max(3600).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  notify_email: z.boolean().optional(),
  notify_push: z.boolean().optional(),
  notify_sms: z.boolean().optional(),
})

async function loadOrCreatePreferences(userId: string): Promise<PreferencesRow> {
  const existing = await findOne<PreferencesRow>('user_preferences', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const created = await create<PreferencesRow>('user_preferences', {
    user_id: userId,
    display_name: null,
    quote_currency: 'USD',
    locale: 'en-US',
    refresh_seconds: 15,
    theme: 'system',
    notify_email: true,
    notify_push: false,
    notify_sms: false,
  })
  return (created.data ?? (created as unknown as PreferencesRow)) as PreferencesRow
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    const row = await loadOrCreatePreferences(userId)
    res.json(row)
  } catch (err) {
    console.error('[crypto-tracker] preferences load failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.put('/', validateBody(updatePreferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
    await loadOrCreatePreferences(userId)
    const updates = { ...req.body, updated_at: new Date() }
    await updateMany(
      'user_preferences',
      [{ field: 'user_id', operator: '=', value: userId }],
      updates,
    )
    const fresh = await findOne<PreferencesRow>('user_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(fresh ?? updates)
  } catch (err) {
    console.error('[crypto-tracker] preferences save failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
