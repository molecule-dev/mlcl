/**
 * feature-flag-manager — workspace settings.
 *
 * GET  /api/settings  → the caller's workspace settings object
 * PATCH /api/settings → validates a partial settings object, MERGES it into
 *                       the stored slice server-side, returns the merge.
 *
 * Why a dedicated channel: the platform user resource NEVER returns
 * `oauthData` on reads, so a page that persists organization settings through
 * PATCH /api/users/:id + reads them back off /users/me silently resets to
 * defaults on every reload. This handler reads/merges the stored slice
 * server-side (the users."oauthData" jsonb column, `workspaceSettings` key)
 * so what the page saves is what the next load returns. Strictly the
 * caller's own row — no cross-tenant reads.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

export const workspaceSettingsSchema = z.object({
  org_name: z.string().max(200).optional(),
})

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>

const SETTINGS_KEY = 'workspaceSettings'

/** Read the stored settings slice for a user row (or null when absent). */
async function readStoredSettings(userId: string): Promise<WorkspaceSettings | null> {
  const row = await findOne<{ oauthData?: unknown }>('users', [
    { field: 'id', operator: '=', value: userId },
  ])
  const oauth = row?.oauthData
  if (!oauth || typeof oauth !== 'object') return null
  const slice = (oauth as Record<string, unknown>)[SETTINGS_KEY]
  const parsed = workspaceSettingsSchema.safeParse(slice)
  return parsed.success ? parsed.data : null
}

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  try {
    const settings = await readStoredSettings(userId)
    res.json({ settings: settings ?? {} })
  } catch (error) {
    logger.error('settings.read failed', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.patch('/', validateBody(workspaceSettingsSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res
      .status(401)
      .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
    return
  }
  try {
    const stored = await readStoredSettings(userId)
    const merged = { ...(stored ?? {}), ...(req.body as WorkspaceSettings) }

    // Merge through jsonb_set so concurrent oauthData writers (platform
    // account sections) never have their keys clobbered by this one.
    const updated = await query<{ oauthData?: unknown }>(
      `UPDATE "users"
          SET "oauthData" = jsonb_set(COALESCE("oauthData", '{}'::jsonb), $1, $2::jsonb, true),
              "updatedAt" = now()
        WHERE "id" = $3
        RETURNING "oauthData"`,
      [`{${SETTINGS_KEY}}`, JSON.stringify(merged), userId],
    )
    if (!updated.rows?.length) {
      res.status(404).json({ error: t('common.notFound', {}, { defaultValue: 'Not found' }) })
      return
    }
    res.json({ settings: merged })
  } catch (error) {
    logger.error('settings.update failed', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
