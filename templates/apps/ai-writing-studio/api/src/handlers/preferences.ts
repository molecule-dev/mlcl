/**
 * Preferences handler — owns the writing preferences round-trip for the
 * Settings page (tone preset, autosave, inline AI suggestions, email
 * notifications). Stored as one row per user in `user_preferences` so
 * GET returns either the persisted row or the documented defaults.
 */
import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { create, findMany, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

const router = Router()

const TONES = ['Professional', 'Casual', 'Academic', 'Creative', 'Technical', 'Persuasive'] as const

const DEFAULTS = {
  default_tone: 'Professional' as (typeof TONES)[number],
  auto_save: true,
  ai_suggestions: true,
  notify_email: true,
}

const updateSchema = z.object({
  default_tone: z.enum(TONES).optional(),
  auto_save: z.boolean().optional(),
  ai_suggestions: z.boolean().optional(),
  notify_email: z.boolean().optional(),
})

interface PreferencesRow {
  id: string
  user_id: string
  default_tone: string
  auto_save: boolean
  ai_suggestions: boolean
  notify_email: boolean
}

async function loadFor(userId: string): Promise<PreferencesRow | null> {
  const rows = (await findMany<PreferencesRow>('user_preferences', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })) as PreferencesRow[]
  return rows[0] ?? null
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const existing = await loadFor(userId)
    if (existing) {
      res.json(existing)
      return
    }
    res.json({ user_id: userId, ...DEFAULTS })
  } catch (error) {
    logger.error('preferences.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.put('/', validateBody(updateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      return
    }
    const patch = req.body as z.infer<typeof updateSchema>
    const existing = await loadFor(userId)
    if (existing) {
      await updateById('user_preferences', existing.id, {
        ...patch,
        updated_at: new Date(),
      } as Record<string, unknown>)
      const refreshed = await loadFor(userId)
      res.json(refreshed ?? { ...existing, ...patch })
      return
    }
    await create('user_preferences', {
      user_id: userId,
      ...DEFAULTS,
      ...patch,
      created_at: new Date(),
      updated_at: new Date(),
    } as Record<string, unknown>)
    const created = await loadFor(userId)
    res.status(201).json(created ?? { user_id: userId, ...DEFAULTS, ...patch })
  } catch (error) {
    logger.error('preferences.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
