/**
 * Per-user preferences — the server-side persistence channel for the
 * Settings (warehouse prefs) and Profile (operator details) pages.
 *
 * The platform user resource never returns `oauthData` on reads, so
 * anything the client wrote there was write-only. This handler stores a
 * per-user JSON blob in `user_preferences` (one row per user, lazily
 * created on first PATCH) and merges top-level keys (`warehousePrefs`,
 * `profile`) so the two pages never clobber each other.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findOne, updateMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const router = Router()

interface PreferencesRow {
  user_id?: string
  data?: Record<string, unknown> | string | null
}

/** jsonb columns can round-trip as object or string — accept both. */
function decodeData(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, unknown>
    } catch (_error) {
      // Malformed JSON string — fall through to the empty blob.
      return {}
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>
  return {}
}

async function readRow(userId: string): Promise<PreferencesRow | null> {
  return findOne<PreferencesRow>('user_preferences', [
    { field: 'user_id', operator: '=', value: userId },
  ])
}

async function writeData(userId: string, data: Record<string, unknown>): Promise<void> {
  const existing = await readRow(userId)
  if (existing) {
    await updateMany('user_preferences', [{ field: 'user_id', operator: '=', value: userId }], {
      data,
      updated_at: new Date(),
    })
  } else {
    await create('user_preferences', { user_id: userId, data, updated_at: new Date() })
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const row = await readRow(userId)
    res.json(decodeData(row?.data))
  } catch (error) {
    logger.error('preferences.read', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

const patchSchema = z.object({
  warehousePrefs: z.record(z.string(), z.unknown()).optional(),
  profile: z.record(z.string(), z.unknown()).optional(),
})

router.patch('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: t('errors.validation', {}, { defaultValue: 'Validation failed' }),
        details: parsed.error.issues,
      })
    }

    const current = decodeData((await readRow(userId))?.data)
    const merged: Record<string, unknown> = { ...current }
    if (parsed.data.warehousePrefs !== undefined) {
      merged.warehousePrefs = {
        ...decodeData(current.warehousePrefs),
        ...parsed.data.warehousePrefs,
      }
    }
    if (parsed.data.profile !== undefined) {
      merged.profile = { ...decodeData(current.profile), ...parsed.data.profile }
    }
    await writeData(userId, merged)
    res.json(merged)
  } catch (error) {
    logger.error('preferences.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
