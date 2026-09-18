import type { Request, Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'

import { getUserId } from '@molecule/api-bonds-default-express'
import type { WhereCondition } from '@molecule/api-database'
import { create, findById, findMany, updateById } from '@molecule/api-database'
import { hasTransport, sendMail } from '@molecule/api-emails'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

const router = Router()

function unauthorized(res: Response): Response {
  return res
    .status(401)
    .json({ error: t('auth.unauthorized', {}, { defaultValue: 'Authentication required' }) })
}

const listAlertsQuery = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  limit: z.coerce.number().optional().default(50),
})

const createRuleSchema = z.object({
  product_id: z.string().nullable().optional(),
  warehouse_id: z.string().nullable().optional(),
  type: z.string().optional(),
  threshold: z.number().int().nonnegative().optional(),
  notify_email: z.string().email().nullable().optional(),
})

const updateRuleSchema = z.object({
  product_id: z.string().nullable().optional(),
  warehouse_id: z.string().nullable().optional(),
  type: z.string().optional(),
  threshold: z.number().int().nonnegative().optional(),
  notify_email: z.string().email().nullable().optional(),
  enabled: z.boolean().optional(),
})

// List alerts (org-scoped via user_id)
router.get('/', validateQuery(listAlertsQuery), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const { status, type, page, limit } = req.query as unknown as z.infer<typeof listAlertsQuery>
    const where: WhereCondition[] = [{ field: 'user_id', operator: '=', value: userId }]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (type) where.push({ field: 'type', operator: '=', value: type })

    const alerts = await findMany('inventory_alerts', {
      where,
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(alerts)
  } catch (error) {
    console.error('Failed to list alerts', error)
    res
      .status(500)
      .json({ error: t('alerts.listFailed', {}, { defaultValue: 'Failed to list alerts' }) })
  }
})

// Get low-stock items across all warehouses (computed)
router.get('/low-stock', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const products = await findMany('products', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
    })

    const lowStockItems: Array<Record<string, unknown>> = []
    for (const product of products) {
      const stockLevels = await findMany('stock_levels', {
        where: [{ field: 'product_id', operator: '=', value: String(product.id) }],
      })
      const totalStock = stockLevels.reduce((sum: number, s) => sum + Number(s.quantity ?? 0), 0)
      if (totalStock <= Number(product.low_stock_threshold)) {
        lowStockItems.push({
          product,
          total_stock: totalStock,
          threshold: product.low_stock_threshold,
          by_warehouse: stockLevels,
        })
      }
    }

    res.json(lowStockItems)
  } catch (error) {
    console.error('Failed to compute low-stock items', error)
    res.status(500).json({
      error: t('alerts.lowStockFailed', {}, { defaultValue: 'Failed to compute low-stock items' }),
    })
  }
})

// Create alert rule
router.post('/rules', validateBody(createRuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const body = req.body as z.infer<typeof createRuleSchema>

    const result = await create('alert_rules', {
      product_id: body.product_id ?? null,
      warehouse_id: body.warehouse_id ?? null,
      type: body.type ?? 'low_stock',
      threshold: body.threshold ?? 10,
      notify_email: body.notify_email ?? null,
      enabled: true,
      created_by: userId,
    })
    res.status(201).json(result.data)
  } catch (error) {
    console.error('Failed to create alert rule', error)
    res.status(500).json({
      error: t('alerts.ruleCreateFailed', {}, { defaultValue: 'Failed to create alert rule' }),
    })
  }
})

// List alert rules
router.get('/rules', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const rules = await findMany('alert_rules', {
      where: [{ field: 'created_by', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rules)
  } catch (error) {
    console.error('Failed to list alert rules', error)
    res
      .status(500)
      .json({ error: t('alerts.rulesFailed', {}, { defaultValue: 'Failed to list alert rules' }) })
  }
})

// Update alert rule
router.put('/rules/:id', validateBody(updateRuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const rule = await findById('alert_rules', id)
    if (!rule || rule.created_by !== userId) {
      res
        .status(404)
        .json({ error: t('alerts.ruleNotFound', {}, { defaultValue: 'Alert rule not found' }) })
      return
    }

    const result = await updateById('alert_rules', id, {
      ...req.body,
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to update alert rule', error)
    res.status(500).json({
      error: t('alerts.ruleUpdateFailed', {}, { defaultValue: 'Failed to update alert rule' }),
    })
  }
})

// Acknowledge alert (org-scoped)
router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const alert = await findById('inventory_alerts', id)
    if (!alert || alert.user_id !== userId) {
      res.status(404).json({ error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }) })
      return
    }

    const result = await updateById('inventory_alerts', id, {
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to acknowledge alert', error)
    res
      .status(500)
      .json({ error: t('alerts.ackFailed', {}, { defaultValue: 'Failed to acknowledge alert' }) })
  }
})

// Dismiss alert (org-scoped)
router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    const id = req.params.id as string
    const alert = await findById('inventory_alerts', id)
    if (!alert || alert.user_id !== userId) {
      res.status(404).json({ error: t('alerts.notFound', {}, { defaultValue: 'Alert not found' }) })
      return
    }

    const result = await updateById('inventory_alerts', id, {
      status: 'dismissed',
      updated_at: new Date().toISOString(),
    })
    res.json(result.data)
  } catch (error) {
    console.error('Failed to dismiss alert', error)
    res
      .status(500)
      .json({ error: t('alerts.dismissFailed', {}, { defaultValue: 'Failed to dismiss alert' }) })
  }
})

// Trigger stock-level check — low_stock + out_of_stock (also called by cron)
router.post('/check', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) return unauthorized(res)
    // Evaluate both stock-quantity rule types. The check previously hard-filtered to 'low_stock',
    // so an enabled 'out_of_stock' rule (created from Settings) produced zero alerts forever.
    // Both are a quantity-vs-threshold comparison; only the alert type/severity/message differ.
    // (A 'variance' rule type is also offered but needs cycle-count/audit data this app doesn't yet
    // model, so it's intentionally not evaluated here.)
    const rules = await findMany('alert_rules', {
      where: [
        { field: 'enabled', operator: '=', value: true },
        { field: 'type', operator: 'in', value: ['low_stock', 'out_of_stock'] },
        { field: 'created_by', operator: '=', value: userId },
      ],
    })
    const alertsCreated: Array<Record<string, unknown>> = []

    for (const rule of rules) {
      const where: WhereCondition[] = []
      if (rule.product_id)
        where.push({ field: 'product_id', operator: '=', value: String(rule.product_id) })
      if (rule.warehouse_id)
        where.push({ field: 'warehouse_id', operator: '=', value: String(rule.warehouse_id) })

      const stockLevels = await findMany('stock_levels', { where })
      const isOutOfStock = String(rule.type) === 'out_of_stock'
      const alertType = isOutOfStock ? 'out_of_stock' : 'low_stock'
      const severity = isOutOfStock ? 'critical' : 'warning'

      for (const stock of stockLevels) {
        if (Number(stock.quantity) <= Number(rule.threshold)) {
          const message = isOutOfStock
            ? t(
                'alerts.outOfStockMessage',
                { quantity: Number(stock.quantity), threshold: Number(rule.threshold) },
                {
                  defaultValue:
                    'Stock level ({{quantity}}) is out of stock (at or below {{threshold}})',
                },
              )
            : t(
                'alerts.lowStockMessage',
                { quantity: Number(stock.quantity), threshold: Number(rule.threshold) },
                {
                  defaultValue:
                    'Stock level ({{quantity}}) is at or below threshold ({{threshold}})',
                },
              )
          const result = await create('inventory_alerts', {
            user_id: userId,
            rule_id: String(rule.id),
            product_id: String(stock.product_id),
            warehouse_id: String(stock.warehouse_id),
            type: alertType,
            severity,
            message,
            status: 'active',
          })

          if (rule.notify_email && hasTransport()) {
            try {
              await sendMail({
                from:
                  process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
                to: String(rule.notify_email),
                subject: isOutOfStock
                  ? t('alerts.outOfStockSubject', {}, { defaultValue: 'Out of Stock Alert' })
                  : t('alerts.lowStockSubject', {}, { defaultValue: 'Low Stock Alert' }),
                text: message,
              })
            } catch (mailErr) {
              console.warn('Stock alert email send failed:', mailErr)
            }
          }

          alertsCreated.push(result.data ?? {})
        }
      }
    }

    res.json({ alerts_created: alertsCreated.length, alerts: alertsCreated })
  } catch (error) {
    console.error('Failed to run low-stock check', error)
    res.status(500).json({
      error: t('alerts.checkFailed', {}, { defaultValue: 'Failed to run low-stock check' }),
    })
  }
})

export default router
