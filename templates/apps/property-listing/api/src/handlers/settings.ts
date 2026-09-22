/**
 * `/api/settings` — per-user application settings (profile slice +
 * notification preferences), persisted server-side.
 *
 * GET     — auth; return the current user's settings ({} when unset)
 * PATCH   — auth; merge the posted slice into the stored settings and
 *           return the merged result
 *
 * WHY a dedicated channel: the platform User resource never returns
 * `oauthData` on reads and silently drops it on writes, so a settings page
 * that stores phone/bio/preferences through PATCH /api/users loses them.
 * This handler reads/merges the app's own slice in the `app_settings`
 * table (one row per user, JSONB `data`) — the platform user row is never
 * touched.
 */

import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const settingsSchema = z.object({
  phone: z.string().max(40).optional(),
  bio: z.string().max(2000).optional(),
  notifyEmail: z.boolean().optional(),
  notifySms: z.boolean().optional(),
  notifyNewLeads: z.boolean().optional(),
  notifyShowings: z.boolean().optional(),
})

type AppSettings = z.infer<typeof settingsSchema>

async function readSettings(userId: string): Promise<AppSettings> {
  const row = await findOne<{ userId: string; data: AppSettings }>('app_settings', [
    { field: 'userId', operator: '=', value: userId },
  ])
  return row?.data ?? {}
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const settings = await readSettings(userId)
    res.json({ data: settings })
  } catch (error) {
    logger.error('settings.get', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', validateBody(settingsSchema), async (req: Request, res: Response) => {
  try {
    const userId = res.locals.session?.userId as string | undefined
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const patch = req.body as AppSettings
    // Server-side merge: absent keys keep their stored values, so partial
    // PATCHes (e.g. toggling one notification) never blank the rest.
    const existing = await readSettings(userId)
    const merged = { ...existing, ...patch }

    const updated = await updateMany(
      'app_settings',
      [{ field: 'userId', operator: '=', value: userId }] as never,
      { data: merged, updatedAt: new Date() },
    )
    // updateMany answers { data, affected } — affected === 0 means the user
    // has no row yet (first save), so seed it. The unique index on
    // app_settings.userId guards the race between two first-saves.
    if (!updated || updated.affected === 0) {
      await create('app_settings', { userId, data: merged })
    }
    res.json({ data: merged })
  } catch (error) {
    logger.error('settings.patch', error)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
