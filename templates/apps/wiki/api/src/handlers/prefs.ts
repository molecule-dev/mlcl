import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

interface PrefRow {
  user_id: string
  workspace_name: string
  subdomain: string | null
  default_landing: 'home' | 'spaces'
  theme: string
  locale: string
  notify_mentions: boolean
  notify_replies: boolean
  notify_assignments: boolean
}

const DEFAULT_PREFS: Omit<PrefRow, 'user_id'> = {
  workspace_name: 'My workspace',
  subdomain: null,
  default_landing: 'home',
  theme: 'system',
  locale: 'en',
  notify_mentions: true,
  notify_replies: true,
  notify_assignments: true,
}

async function ensurePrefs(userId: string): Promise<PrefRow> {
  const existing = await findOne<PrefRow>('wiki_user_prefs', [
    { field: 'user_id', operator: '=', value: userId },
  ])
  if (existing) return existing
  // The lookup above and this insert are not atomic, and /me is called
  // concurrently for a freshly signed-up user: both callers see no row and both
  // insert, so the loser violates wiki_user_prefs_pkey and /me answers 500
  // (observed in the API log as `[me.get] error: duplicate key value violates
  // unique constraint "wiki_user_prefs_pkey"`). Losing that race is not an error
  // — the winner wrote exactly the defaults we wanted, so adopt its row.
  try {
    const created = await create<PrefRow>('wiki_user_prefs', {
      user_id: userId,
      ...DEFAULT_PREFS,
      updated_at: new Date(),
    })
    return (created.data as PrefRow) ?? { user_id: userId, ...DEFAULT_PREFS }
  } catch (error) {
    const raced = await findOne<PrefRow>('wiki_user_prefs', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    // No row means the insert failed for some OTHER reason — do not swallow it.
    if (!raced) throw error
    return raced
  }
}

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const prefs = await ensurePrefs(userId)
    res.json(prefs)
  } catch (err) {
    console.error('[prefs.get]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const updateSchema = z.object({
  workspace_name: z.string().min(1).max(120).optional(),
  subdomain: z.string().min(0).max(60).nullable().optional(),
  default_landing: z.enum(['home', 'spaces']).optional(),
  theme: z.enum(['system', 'light', 'dark']).optional(),
  locale: z.string().min(2).max(10).optional(),
  notify_mentions: z.boolean().optional(),
  notify_replies: z.boolean().optional(),
  notify_assignments: z.boolean().optional(),
})

router.patch('/me', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    const body = req.body as z.infer<typeof updateSchema>
    await ensurePrefs(userId)
    // updateById expects an `id` column. wiki_user_prefs uses `user_id` as PK,
    // so we update via a raw update call by re-creating-or-updating.
    // The simpler path here: read, merge, then upsert via direct query with
    // findOne-then-create fallback. Since updateById('wiki_user_prefs', userId)
    // would target an `id` column that doesn't exist, we instead use the
    // database bond's underlying client. To keep the abstraction clean, we
    // emulate upsert via delete-then-insert when needed.
    const existing = await findOne<PrefRow>('wiki_user_prefs', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    const merged = { ...DEFAULT_PREFS, ...(existing ?? {}), ...body }
    // wiki_user_prefs uses user_id as the PK (no `id` column), so updateById
    // doesn't apply — use a parameterised UPDATE via the database bond's
    // raw query interface.
    await query(
      `UPDATE "wiki_user_prefs"
        SET workspace_name = $2,
            subdomain = $3,
            default_landing = $4,
            theme = $5,
            locale = $6,
            notify_mentions = $7,
            notify_replies = $8,
            notify_assignments = $9,
            updated_at = NOW()
        WHERE user_id = $1`,
      [
        userId,
        merged.workspace_name,
        merged.subdomain,
        merged.default_landing,
        merged.theme,
        merged.locale,
        merged.notify_mentions,
        merged.notify_replies,
        merged.notify_assignments,
      ],
    )
    const updated = await findOne<PrefRow>('wiki_user_prefs', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(updated)
  } catch (err) {
    console.error('[prefs.patch]', err)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
export { ensurePrefs }
