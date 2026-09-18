/**
 * Profile — aggregates the listener-facing stats and preferences the
 * `Profile` and `Settings` pages need.
 *
 * - `GET  /profile/me`           — user + subscription/queue counts + listening totals
 * - `GET  /profile/preferences`  — the user_preferences blob (or `{}` if unset)
 * - `PUT  /profile/preferences`  — upsert preferences (shallow merge over existing)
 *
 * The preferences blob is intentionally schema-less at the DB layer —
 * Settings.tsx writes whatever toggles the user flips, and the rest of
 * the app reads keys it knows about (autoplay, push toggles, etc.). Any
 * key validation lives in Settings.tsx, not here, so adding a new
 * preference doesn't require a backend change.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, findById, findMany, query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { seedDemoForUserOnce } from './_seed.js'

const router = Router()

router.get('/me', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const user = await findById<Record<string, unknown>>('users', userId)
    if (!user) {
      res
        .status(404)
        .json({ error: t('users.notFound', undefined, { defaultValue: 'User not found' }) })
      return
    }
    // First-touch demo seed: subscribes the user to two shows, queues
    // one episode, saves one, posts welcome notifications. Idempotent —
    // re-running for the same user is a no-op.
    await seedDemoForUserOnce(userId).catch(() => {
      /* best-effort */
    })
    const [subscriptions, queueItems, savedEpisodes] = await Promise.all([
      count('subscriptions', [{ field: 'user_id', operator: '=', value: userId }]),
      count('queue_items', [{ field: 'user_id', operator: '=', value: userId }]),
      count('saved_episodes', [{ field: 'user_id', operator: '=', value: userId }]).catch(() => 0),
    ])
    // Sum listening minutes from listening_progress.position_sec. We
    // page through here rather than firing a SQL SUM() because the
    // database bond's `findMany` is the only typed primitive available
    // — and at flagship scale the per-user row count is tiny (<10k).
    const progress = await findMany<Record<string, unknown>>('listening_progress', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 5000,
    })
    let totalSeconds = 0
    let completed = 0
    for (const row of progress) {
      totalSeconds += Number(row.position_sec ?? 0)
      if (row.completed_at) completed += 1
    }
    res.json({
      id: userId,
      name: user.name ?? null,
      email: user.email ?? null,
      planKey: user.planKey ?? null,
      subscriptions,
      queueItems,
      savedEpisodes,
      listenedMinutes: Math.round(totalSeconds / 60),
      episodesCompleted: completed,
    })
  } catch (error) {
    logger.error('profile.me', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/preferences', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const rows = await findMany<{ preferences: Record<string, unknown> }>('user_preferences', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    res.json(rows[0]?.preferences ?? {})
  } catch (error) {
    logger.error('profile.getPreferences', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

const preferencesSchema = z.record(z.string(), z.unknown())

router.put('/preferences', validateBody(preferencesSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const body = req.body as Record<string, unknown>
    // Upsert + shallow merge using a single SQL statement so concurrent
    // toggles don't lose each other's values. The database bond exposes
    // raw `executeQuery` for cases like this where the typed CRUD API
    // (no upsert primitive) would force a less-safe read-modify-write.
    await query(
      `INSERT INTO user_preferences (user_id, preferences, updated_at)
       VALUES ($1::uuid, $2::jsonb, now())
       ON CONFLICT (user_id) DO UPDATE
         SET preferences = user_preferences.preferences || EXCLUDED.preferences,
             updated_at = now()`,
      [userId, JSON.stringify(body)],
    )
    const rows = await findMany<{ preferences: Record<string, unknown> }>('user_preferences', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 1,
    })
    res.json(rows[0]?.preferences ?? {})
  } catch (error) {
    logger.error('profile.putPreferences', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
