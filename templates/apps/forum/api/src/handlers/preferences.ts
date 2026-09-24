/**
 * User preferences endpoint.
 *
 * Backs the Settings page's notification + display toggles. Preferences
 * live in a dedicated `user_preferences` table (a jsonb bag per user),
 * NOT in the user resource's `oauthData` — the platform user CRUD never
 * returns `oauthData` on reads, so values stored there are write-only
 * from the client's point of view (they silently vanished on reload).
 *
 * Owner / IDOR scope marker: `requireOwner`/`user_id` — the userId is
 * sourced from the verified session, never from the request body or
 * params, so a user can only ever touch their own bag. PATCHes MERGE
 * into the stored bag so a partial update never clobbers other keys.
 *
 * @module
 */

import type { Request, Response } from 'express'
import { Router } from 'express'

import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

function getSession(res: Response): { userId?: string } | undefined {
  return res.locals.session as { userId?: string } | undefined
}

function requireOwner(res: Response): { userId: string } | null {
  const session = getSession(res)
  const userId = session?.userId
  if (!userId) {
    res.status(401).json({
      error: t('common.unauthorized', {}, { defaultValue: 'Unauthorized' }),
    })
    return null
  }
  return { userId }
}

async function ensurePreferencesTable(): Promise<void> {
  await query(
    `CREATE TABLE IF NOT EXISTS user_preferences (
       user_id uuid PRIMARY KEY,
       prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
       updated_at timestamptz NOT NULL DEFAULT now()
     )`,
  )
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const owner = requireOwner(res)
    if (!owner) return
    await ensurePreferencesTable()
    const rows = await query<{ prefs: Record<string, unknown> }>(
      `SELECT prefs FROM user_preferences WHERE user_id = $1`,
      [owner.userId],
    )
    res.json({ prefs: rows.rows?.[0]?.prefs ?? {} })
  } catch (err) {
    logger.error('preferences.get', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', async (req: Request, res: Response) => {
  try {
    const owner = requireOwner(res)
    if (!owner) return
    await ensurePreferencesTable()
    const incoming = req.body as unknown
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      res.status(400).json({
        error: t('preferences.badRequest', {}, { defaultValue: 'Invalid preferences payload' }),
      })
      return
    }
    // Upsert + merge: keys the PATCH omits keep their stored values.
    const rows = await query<{ prefs: Record<string, unknown> }>(
      `INSERT INTO user_preferences (user_id, prefs, updated_at)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE
         SET prefs = user_preferences.prefs || EXCLUDED.prefs,
             updated_at = now()
       RETURNING prefs`,
      [owner.userId, JSON.stringify(incoming)],
    )
    res.json({ prefs: rows.rows?.[0]?.prefs ?? incoming })
  } catch (err) {
    logger.error('preferences.update', err)
    res.status(500).json({
      error: t('common.serverError', {}, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
