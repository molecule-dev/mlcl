import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

/**
 * Server-side preferences channel for the Settings page.
 *
 * The platform user resource NEVER returns `oauthData` on reads — the column
 * is on the sensitive-column denylist (`stripSensitiveUserColumns`) — so a
 * client that saves preferences via `PATCH /api/users/:id { oauthData }` can
 * never read them back. This router is the settings round-trip: it reads and
 * merges ONLY the `preferences` slice of `users."oauthData"` server-side and
 * returns just that slice. The sensitive column itself never crosses the wire.
 */

const router = Router()

const preferencesSchema = z.object({
  home_airport: z.string().max(8).optional(),
  currency: z.string().min(3).max(8).optional(),
  notifications: z.record(z.string(), z.boolean()).optional(),
})

interface PreferencesRow {
  preferences: Record<string, unknown> | null
}

function requireUser(res: Response): string | null {
  return getUserId(res) ?? null
}

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
}

/** Read the persisted preferences slice (server-side `oauthData` access). */
async function readPreferences(userId: string): Promise<Record<string, unknown>> {
  const result = await query<PreferencesRow>(
    `SELECT "oauthData" -> 'preferences' AS preferences FROM "users" WHERE "id" = $1`,
    [userId],
  )
  const stored = result.rows[0]?.preferences
  return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
}

// GET /api/preferences — the signed-in user's merged preferences slice.
router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return unauthorized(res)
    res.json(await readPreferences(userId))
  } catch (error) {
    logger.error('preferences.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// PATCH /api/preferences — shallow-merge the submitted slice into the stored
// one server-side (single UPDATE, so concurrent saves cannot lose either
// side's top-level keys) and return the merged slice.
router.patch('/', validateBody(preferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = requireUser(res)
    if (!userId) return unauthorized(res)
    const incoming = req.body as Record<string, unknown>
    const result = await query<PreferencesRow>(
      `UPDATE "users" SET
         "oauthData" = jsonb_set(
           COALESCE("oauthData", '{}'::jsonb),
           '{preferences}',
           COALESCE("oauthData" -> 'preferences', '{}'::jsonb) || $2::jsonb,
           true
         ),
         "updatedAt" = now()
       WHERE "id" = $1
       RETURNING "oauthData" -> 'preferences' AS preferences`,
      [userId, JSON.stringify(incoming)],
    )
    const stored = result.rows[0]?.preferences
    res.json(stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : incoming)
  } catch (error) {
    logger.error('preferences.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
