/**
 * User preferences handler — workspace-wide UI defaults.
 *
 * Backs the `/settings` and `/profile` pages. The molecule user
 * resource locks down its `props` schema (username/name/email/oauth/
 * plan only), so anything app-specific lives in the
 * `user_preferences` table as a single jsonb blob per user.
 *
 * Endpoints:
 *   GET   /api/user-preferences     → returns the calling user's prefs (auto-creates an empty row on first read)
 *   PATCH /api/user-preferences     → merges the body into the calling user's prefs
 *   PUT   /api/user-preferences     → replaces the calling user's prefs
 *
 * The `PATCH /api/users/:id` route is also wired (in router.ts) to this
 * same handler when the body is `{ data: {...} }` so existing UI code
 * that "patches the user with `data: { ... }`" works without a
 * separate code path.
 *
 * Standard owner-scoping: there is no per-row id concept — the row is
 * implicitly keyed by `user_id`, derived from `res.locals.session`.
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById, type WhereCondition } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const prefsBodySchema = z
  .object({
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()

interface UserPreferencesRow {
  user_id: string
  data: Record<string, unknown>
  created_at?: Date | string
  updated_at?: Date | string
}

interface UserPreferencesPkRow extends UserPreferencesRow {
  id?: string
}

async function readForUser(userId: string): Promise<UserPreferencesRow> {
  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const rows = await findMany<UserPreferencesPkRow>('user_preferences', { where, limit: 1 })
  if (rows.length > 0) {
    const row = rows[0]
    return {
      user_id: row.user_id,
      data: (row.data as Record<string, unknown>) ?? {},
      created_at: row.created_at,
      updated_at: row.updated_at,
    }
  }
  const created = await create<UserPreferencesPkRow>('user_preferences', {
    user_id: userId,
    data: {},
    created_at: new Date(),
    updated_at: new Date(),
  })
  const data = created.data as UserPreferencesPkRow
  return {
    user_id: data.user_id,
    data: (data.data as Record<string, unknown>) ?? {},
    created_at: data.created_at,
    updated_at: data.updated_at,
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      })
      return
    }
    const row = await readForUser(userId)
    res.json(row)
  } catch (err) {
    logger.error('user-preferences.get failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

async function upsertPreferences({
  userId,
  body,
  merge,
}: {
  userId: string
  body: z.infer<typeof prefsBodySchema>
  merge: boolean
}): Promise<UserPreferencesRow> {
  const incoming: Record<string, unknown> = body.data
    ? { ...(body.data as Record<string, unknown>) }
    : Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'data'))

  const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
  const rows = await findMany<UserPreferencesPkRow>('user_preferences', { where, limit: 1 })

  if (rows.length === 0) {
    const created = await create<UserPreferencesPkRow>('user_preferences', {
      user_id: userId,
      data: incoming,
      created_at: new Date(),
      updated_at: new Date(),
    })
    const data = created.data as UserPreferencesPkRow
    return {
      user_id: data.user_id,
      data: (data.data as Record<string, unknown>) ?? {},
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  const existing = rows[0]
  const next: Record<string, unknown> = merge
    ? { ...((existing.data as Record<string, unknown>) ?? {}), ...incoming }
    : incoming

  const idForUpdate = (existing.id as string | undefined) ?? existing.user_id
  const updated = await updateById<UserPreferencesPkRow>('user_preferences', idForUpdate, {
    data: next,
    updated_at: new Date(),
  })
  const data = updated.data as UserPreferencesPkRow
  return {
    user_id: data.user_id ?? userId,
    data: (data.data as Record<string, unknown>) ?? next,
    created_at: data.created_at ?? existing.created_at,
    updated_at: data.updated_at,
  }
}

router.patch('/', validateBody(prefsBodySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      })
      return
    }
    const out = await upsertPreferences({
      userId,
      body: req.body as z.infer<typeof prefsBodySchema>,
      merge: true,
    })
    res.json(out)
  } catch (err) {
    logger.error('user-preferences.patch failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.put('/', validateBody(prefsBodySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      })
      return
    }
    const out = await upsertPreferences({
      userId,
      body: req.body as z.infer<typeof prefsBodySchema>,
      merge: false,
    })
    res.json(out)
  } catch (err) {
    logger.error('user-preferences.put failed', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
