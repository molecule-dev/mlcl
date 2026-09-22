/**
 * User preferences handler — owner-scoped playback/social/notification
 * settings backed by the `user_preferences` table (seeded with a baseline
 * row by `_seed.ts` on first touch).
 *
 * Routes:
 *   GET   /api/preferences    read my preferences (defaults if no row yet)
 *   PATCH /api/preferences    partial update (upserts the row)
 *
 * Owner scope on every read/mutate via `res.locals.session.userId`.
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

export interface DBUserPreferences {
  user_id: string
  display_name: string | null
  country: string | null
  audio_quality: string
  crossfade: boolean
  gapless: boolean
  normalize: boolean
  allow_explicit: boolean
  public_profile: boolean
  public_listening: boolean
  allow_followers: boolean
  share_listening: boolean
  notify_new_releases: boolean
  notify_weekly_recap: boolean
  notify_follower_activity: boolean
  notify_concert_nearby: boolean
  updated_at: string | Date
}

/** Mirrors the column defaults in `0011_music_streaming_extras.sql`. */
const DEFAULT_PREFERENCES: Omit<DBUserPreferences, 'user_id' | 'updated_at'> = {
  display_name: null,
  country: null,
  audio_quality: 'lossless',
  crossfade: true,
  gapless: true,
  normalize: true,
  allow_explicit: true,
  public_profile: true,
  public_listening: false,
  allow_followers: true,
  share_listening: false,
  notify_new_releases: true,
  notify_weekly_recap: true,
  notify_follower_activity: false,
  notify_concert_nearby: true,
}

const patchSchema = z
  .object({
    display_name: z.string().max(200).nullable().optional(),
    country: z.string().max(120).nullable().optional(),
    audio_quality: z.enum(['lossless', 'high', 'normal']).optional(),
    crossfade: z.boolean().optional(),
    gapless: z.boolean().optional(),
    normalize: z.boolean().optional(),
    allow_explicit: z.boolean().optional(),
    public_profile: z.boolean().optional(),
    public_listening: z.boolean().optional(),
    allow_followers: z.boolean().optional(),
    share_listening: z.boolean().optional(),
    notify_new_releases: z.boolean().optional(),
    notify_weekly_recap: z.boolean().optional(),
    notify_follower_activity: z.boolean().optional(),
    notify_concert_nearby: z.boolean().optional(),
  })
  .strict()

router.get('/', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const row = await findOne<DBUserPreferences>('user_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(row ?? { ...DEFAULT_PREFERENCES, user_id: userId })
  } catch (error) {
    console.error('music.preferences GET /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.patch('/', validateBody(patchSchema), async (req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    res.status(401).json({
      error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
    })
    return
  }
  try {
    const patch = req.body as z.infer<typeof patchSchema>
    const existing = await findOne<DBUserPreferences>('user_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    if (existing) {
      await updateMany('user_preferences', [{ field: 'user_id', operator: '=', value: userId }], {
        ...patch,
        updated_at: new Date(),
      })
    } else {
      await create('user_preferences', {
        ...DEFAULT_PREFERENCES,
        ...patch,
        user_id: userId,
        updated_at: new Date(),
      })
    }
    const updated = await findOne<DBUserPreferences>('user_preferences', [
      { field: 'user_id', operator: '=', value: userId },
    ])
    res.json(updated ?? { ...DEFAULT_PREFERENCES, ...patch, user_id: userId })
  } catch (error) {
    console.error('music.preferences PATCH /', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
