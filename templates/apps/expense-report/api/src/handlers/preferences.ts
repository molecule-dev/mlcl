/**
 * Per-user workspace preferences for expense-report.
 *
 * The shared `users` row is owned by `@molecule/api-resource-user` and its
 * read shape NEVER returns `oauthData`, so reimbursement-method and
 * notification toggles persisted there by the Settings page silently reset
 * on every reload. This handler is the app's own server-side channel:
 * preferences live in the `user_preferences` table (0012_user_preferences.sql)
 * and round-trip through GET/PATCH /api/preferences.
 *
 * GET   /api/preferences  → row for the signed-in user (auto-created with
 *                           defaults if missing)
 * PATCH /api/preferences  → merge a subset of fields, returns the full row
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
  payout_method: string
  notify_submitted: boolean
  notify_reviewed: boolean
  notify_reimbursed: boolean
  notify_policy: boolean
  created_at?: Date | string
  updated_at?: Date | string
}

const updatePreferencesSchema = z.object({
  payout_method: z.enum(['ach', 'card']).optional(),
  notify_submitted: z.boolean().optional(),
  notify_reviewed: z.boolean().optional(),
  notify_reimbursed: z.boolean().optional(),
  notify_policy: z.boolean().optional(),
})

async function loadOrCreatePreferences(userId: string): Promise<PreferencesRow> {
  const existing = await findOne<PreferencesRow>('user_preferences', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  const created = await create<PreferencesRow>('user_preferences', {
    user_id: userId,
    payout_method: 'ach',
    notify_submitted: true,
    notify_reviewed: true,
    notify_reimbursed: true,
    notify_policy: true,
  })
  return ((created as { data?: PreferencesRow }).data ?? created) as PreferencesRow
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  try {
    const row = await loadOrCreatePreferences(userId)
    res.json(row)
  } catch (err) {
    console.error('expense-report.preferences.load_failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

router.patch('/', validateBody(updatePreferencesSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) return res.status(401).json({ error: t('auth.unauthorized') })
  try {
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
    console.error('expense-report.preferences.save_failed', err)
    res.status(500).json({ error: t('errors.internalServer') })
  }
})

export default router
