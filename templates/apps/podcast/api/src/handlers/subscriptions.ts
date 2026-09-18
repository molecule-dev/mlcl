/**
 * Subscriptions handler — owner only.
 *
 * Authorization: every read/write is scoped by the authenticated session
 * userId; no by-id mutations are exposed (subscription identity is the
 * (user_id, show_id) pair).
 */

import { type Request, type Response, Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateParams } from '@molecule/api-middleware-validation'

import type { PodcastLimits } from '../tiers.js'

const router = Router()

const showIdOf = (req: Request): string => String(req.params.showId)

const showIdParamSchema = z.object({ showId: z.string().uuid() })

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const subs = await findMany<Record<string, unknown>>('subscriptions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(subs)
  } catch (error) {
    logger.error('subscriptions.list', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

// Library calls this — returns the joined show rows so the page can render
// covers + titles in one round-trip.
router.get('/shows', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
      })
      return
    }
    const subs = await findMany<Record<string, unknown>>('subscriptions', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    const out = await Promise.all(
      subs.map(async (s) => {
        const show = await findById<Record<string, unknown>>('shows', String(s.show_id))
        return show ? { ...show, subscribed_at: s.created_at } : null
      }),
    )
    res.json(out.filter(Boolean))
  } catch (error) {
    logger.error('subscriptions.shows', error)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
    })
  }
})

router.get(
  '/status/:showId',
  validateParams(showIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.json({ subscribed: false })
        return
      }
      const existing = await findMany('subscriptions', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'show_id', operator: '=', value: showIdOf(req) },
        ],
        limit: 1,
      })
      res.json({ subscribed: existing.length > 0 })
    } catch (error) {
      logger.error('subscriptions.status', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.post(
  '/:showId',
  enforceLimit<PodcastLimits>({
    limitType: 'maxSubscriptions',
    getLimit: (limits) => limits.maxSubscriptions,
    getCurrent: async (userId) =>
      count('subscriptions', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as never,
  validateParams(showIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const show = await findById<Record<string, unknown>>('shows', showIdOf(req))
      if (!show) {
        res
          .status(404)
          .json({ error: t('shows.notFound', undefined, { defaultValue: 'Show not found' }) })
        return
      }
      const existing = await findMany<Record<string, unknown>>('subscriptions', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'show_id', operator: '=', value: showIdOf(req) },
        ],
        limit: 1,
      })
      if (existing[0]) {
        res.json({ subscribed: true })
        return
      }
      await create('subscriptions', {
        user_id: userId,
        show_id: showIdOf(req),
        created_at: new Date(),
      })
      await updateById('shows', showIdOf(req), {
        subscriber_count: ((show.subscriber_count as number) ?? 0) + 1,
      })
      res.status(201).json({ subscribed: true })
    } catch (error) {
      logger.error('subscriptions.subscribe', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

router.delete(
  '/:showId',
  validateParams(showIdParamSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required' }),
        })
        return
      }
      const existing = await findMany<Record<string, unknown>>('subscriptions', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'show_id', operator: '=', value: showIdOf(req) },
        ],
        limit: 1,
      })
      if (existing[0]) {
        await deleteById('subscriptions', String(existing[0].id))
        const show = await findById<Record<string, unknown>>('shows', showIdOf(req))
        if (show) {
          await updateById('shows', showIdOf(req), {
            subscriber_count: Math.max(0, ((show.subscriber_count as number) ?? 0) - 1),
          })
        }
      }
      res.json({ subscribed: false })
    } catch (error) {
      logger.error('subscriptions.unsubscribe', error)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
      })
    }
  },
)

export default router
