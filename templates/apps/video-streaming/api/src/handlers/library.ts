/**
 * Library handler — owner-only watch_history + watch_later.
 *
 * The Library page (`/library`) renders three rails: history, watch later,
 * and liked videos. History is implicitly written by the watch endpoint;
 * this module exposes the read + manual append/remove surfaces that the UI
 * uses, plus the explicit "save for later" flow.
 *
 * Authorization: every endpoint scopes by `userId` from the session — no
 * route accepts a `user_id` query parameter, so an attacker cannot read or
 * mutate another user's library.
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId, uuidParamSchema as idParamSchema } from '@molecule/api-bonds-default-express'
import {
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { validateBody, validateParams } from '@molecule/api-middleware-validation'

const router = Router()

const idOf = (req: Request): string => String(req.params.id)

const addHistorySchema = z.object({
  video_id: z.string().uuid(),
  position_sec: z.number().int().min(0).optional(),
})

const addLaterSchema = z.object({
  video_id: z.string().uuid(),
})

router.get('/history', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'watched_at', direction: 'desc' }]
    const history = await findMany('watch_history', { where, orderBy, limit: 100 })
    res.json(history)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/history', validateBody(addHistorySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    // Honor the user's "Save watch history" preference (Settings →
    // oauthData.preferences.historyOn). Opt-out: default on; only an explicit
    // `false` skips recording (so pausing history actually stops it).
    const viewer = await findById<{ oauthData?: { preferences?: { historyOn?: unknown } } }>(
      'users',
      userId,
    )
    if (viewer?.oauthData?.preferences?.historyOn === false) {
      res.status(200).json({ skipped: true })
      return
    }
    const { video_id, position_sec } = req.body as z.infer<typeof addHistorySchema>
    // Upsert the (user, video) history row: a re-watch updates the same row instead of inserting a
    // duplicate, and the saved resume position is preserved — only overwrite position_sec when the
    // caller actually supplies one (the initial page-load ping omits it, so it must not reset it).
    const existing = await findMany<{ id: string }>('watch_history', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'video_id', operator: '=', value: video_id },
      ],
      orderBy: [{ field: 'watched_at', direction: 'desc' }],
      limit: 1,
    })
    if (existing[0]) {
      const update: Record<string, unknown> = { watched_at: new Date() }
      if (position_sec !== undefined) update.position_sec = position_sec
      const updated = await updateById('watch_history', existing[0].id, update)
      res.status(200).json(updated.data ?? updated)
      return
    }
    const row = {
      user_id: userId,
      video_id,
      position_sec: position_sec ?? 0,
      watched_at: new Date(),
    }
    try {
      const result = await create('watch_history', row)
      res.status(201).json(result.data ?? result)
    } catch (createError) {
      // Lost the upsert race: a concurrent ping for the same (user, video)
      // inserted first and the watch_history_user_video_uidx unique index
      // rejected ours. Update the winner's row instead of 500-ing.
      const raced = await findMany<{ id: string }>('watch_history', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'video_id', operator: '=', value: video_id },
        ],
        orderBy: [{ field: 'watched_at', direction: 'desc' }],
        limit: 1,
      })
      if (!raced[0]) throw createError
      const update: Record<string, unknown> = { watched_at: new Date() }
      if (position_sec !== undefined) update.position_sec = position_sec
      const updated = await updateById('watch_history', raced[0].id, update)
      res.status(200).json(updated.data ?? updated)
    }
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get('/later', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    const orderBy: OrderBy[] = [{ field: 'added_at', direction: 'desc' }]
    const later = await findMany('watch_later', { where, orderBy, limit: 100 })
    res.json(later)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.post('/later', validateBody(addLaterSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const { video_id } = req.body as z.infer<typeof addLaterSchema>
    const existing = await findMany<Record<string, unknown>>('watch_later', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'video_id', operator: '=', value: video_id },
      ],
      limit: 1,
    })
    if (existing[0]) {
      res.status(200).json(existing[0])
      return
    }
    const result = await create('watch_later', {
      user_id: userId,
      video_id,
      added_at: new Date(),
    })
    res.status(201).json(result.data ?? result)
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.delete('/later/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    // Authorize-then-delete. Look up the row, ensure it's the caller's,
    // then deleteById. This avoids IDOR on /library/later/:id.
    const found = await findMany<Record<string, unknown>>('watch_later', {
      where: [
        { field: 'id', operator: '=', value: idOf(req) },
        { field: 'user_id', operator: '=', value: userId },
      ],
      limit: 1,
    })
    if (!found[0]) {
      res
        .status(404)
        .json({ error: t('library.notFound', undefined, { defaultValue: 'Item not found' }) })
      return
    }
    await deleteById('watch_later', idOf(req))
    res.status(204).end()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

export default router
