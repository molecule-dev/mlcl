/**
 * Price-alert handlers — every route is owner-scoped via `user_id`. The
 * cron-driven evaluator at the bottom is mounted on a separate admin-only
 * route (`POST /alerts/cron/init`) so it never runs implicitly for normal
 * authenticated users.
 *
 * @module
 */

import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { schedule } from '@molecule/api-cron'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import { requireAdmin } from '../middleware/require-admin.js'
import type { PriceComparisonLimits } from '../tiers.js'

const router = Router()

const createAlertSchema = z.object({
  productId: z.string().uuid(),
  targetPrice: z.number().positive(),
  alertType: z.enum(['below', 'drop']).default('below'),
  channel: z.enum(['email', 'push']).default('email'),
})

const updateAlertSchema = z.object({
  targetPrice: z.number().positive().optional(),
  alertType: z.enum(['below', 'drop']).optional(),
  channel: z.enum(['email', 'push']).optional(),
  status: z.enum(['active', 'paused', 'triggered']).optional(),
})

router.get('/', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }

    const alerts = await findMany<Record<string, unknown>>('price_alerts', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: 200,
    })

    const enriched = await Promise.all(
      alerts.map(async (alert) => {
        const product = await findById('products', alert.product_id as string)
        return { ...alert, product }
      }),
    )

    res.json(enriched)
  } catch (error) {
    logger.error('alerts.list', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('price_alerts', id)

    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alert.notFound', {}, { defaultValue: 'Alert not found' }) })
    }

    res.json(alert)
  } catch (error) {
    logger.error('alerts.get', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.post(
  '/',
  enforceLimit<PriceComparisonLimits>({
    limitType: 'maxAlerts',
    getLimit: (limits) => limits.maxAlerts,
    getCurrent: async (userId) =>
      count('price_alerts', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createAlertSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId) {
        return res
          .status(401)
          .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
      }
      const { productId, targetPrice, alertType, channel } = req.body as z.infer<
        typeof createAlertSchema
      >

      const product = await findById('products', productId)
      if (!product) {
        return res
          .status(404)
          .json({ error: t('product.notFound', {}, { defaultValue: 'Product not found' }) })
      }

      const existing = await findMany<Record<string, unknown>>('price_alerts', {
        where: [
          { field: 'user_id', operator: '=', value: userId },
          { field: 'product_id', operator: '=', value: productId },
          { field: 'status', operator: '=', value: 'active' },
        ],
        limit: 1,
      })

      if (existing.length > 0) {
        return res.status(409).json({
          error: t(
            'alert.duplicate',
            {},
            { defaultValue: 'You already have an active alert for this product' },
          ),
        })
      }

      const result = await create('price_alerts', {
        user_id: userId,
        product_id: productId,
        target_price: Math.round(targetPrice * 100),
        alert_type: alertType,
        channel,
        status: 'active',
        last_notified_at: null,
        times_triggered: 0,
        created_at: new Date(),
      })

      res.status(201).json(result.data)
    } catch (error) {
      logger.error('alerts.create', error)
      res
        .status(500)
        .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
    }
  },
)

router.put('/:id', validateBody(updateAlertSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('price_alerts', id)

    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alert.notFound', {}, { defaultValue: 'Alert not found' }) })
    }

    const { targetPrice, alertType, channel, status } = req.body as z.infer<
      typeof updateAlertSchema
    >
    const updates: Record<string, unknown> = {}
    if (targetPrice !== undefined) updates.target_price = Math.round(targetPrice * 100)
    if (alertType !== undefined) updates.alert_type = alertType
    if (channel !== undefined) updates.channel = channel
    if (status !== undefined) updates.status = status

    const updated = await updateById('price_alerts', id, updates)
    res.json(updated.data)
  } catch (error) {
    logger.error('alerts.update', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      return res
        .status(401)
        .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Unauthorized' }) })
    }
    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('price_alerts', id)

    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alert.notFound', {}, { defaultValue: 'Alert not found' }) })
    }

    await deleteById('price_alerts', id)
    res.status(204).end()
  } catch (error) {
    logger.error('alerts.delete', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

// Admin endpoint — wires the periodic alert-evaluation cron job. Re-running
// is a no-op because the cron provider key is unique. Gated by `requireAdmin`
// (401 unauthenticated, 403 non-admin): this installs a global, system-wide
// cron that iterates EVERY user's active alerts and emails them, so a valid
// session alone is NOT sufficient — only the catalog operator may install it.
router.post('/cron/init', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const cronExpression = process.env.ALERT_CHECK_CRON || '0 */1 * * *'

    await schedule('check-price-alerts', cronExpression, async () => {
      const activeAlerts = await findMany<Record<string, unknown>>('price_alerts', {
        where: [{ field: 'status', operator: '=', value: 'active' }],
        limit: 10000,
      })

      for (const alert of activeAlerts) {
        const product = await findById<Record<string, unknown>>(
          'products',
          alert.product_id as string,
        )
        if (!product || !product.best_price) continue

        const bestPrice = product.best_price as number
        const targetPrice = alert.target_price as number
        if (bestPrice > targetPrice) continue

        const lastNotified = alert.last_notified_at as string | null
        if (lastNotified) {
          const hoursSince = (Date.now() - new Date(lastNotified).getTime()) / (1000 * 60 * 60)
          if (hoursSince < 24) continue
        }

        const user = await findById<Record<string, unknown>>('users', alert.user_id as string)
        if (!user) continue

        await sendMail({
          from: process.env.EMAIL_FROM ?? `noreply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
          to: user.email as string,
          subject: t(
            'alert.emailSubject',
            { product: String(product.name) },
            { defaultValue: `Price drop alert: ${String(product.name)}` },
          ),
          text: t(
            'alert.emailBody',
            { product: String(product.name), price: bestPrice, target: targetPrice },
            {
              defaultValue: `${String(product.name)} is now ${(bestPrice / 100).toFixed(2)} (target ${(targetPrice / 100).toFixed(2)}).`,
            },
          ),
        })

        await updateById('price_alerts', alert.id as string, {
          last_notified_at: new Date(),
          times_triggered: ((alert.times_triggered as number) || 0) + 1,
        })
      }
    })

    res.json({
      message: t(
        'alert.cronInitialized',
        {},
        { defaultValue: 'Alert checking cron job initialized' },
      ),
    })
  } catch (error) {
    logger.error('alerts.cronInit', error)
    res
      .status(500)
      .json({ error: t('errors.internalServer', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
