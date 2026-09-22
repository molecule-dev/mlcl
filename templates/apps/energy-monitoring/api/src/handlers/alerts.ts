/**
 * Alert rules + alerts handler.
 *
 * All queries are scoped by `user_id`. The `POST /check` route is intended to
 * be invoked by the cron bond (`@molecule/api-cron-node-cron`) but is also
 * callable by the owner for manual evaluation.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { sendMail } from '@molecule/api-emails'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { validateBody } from '@molecule/api-middleware-validation'

import type { EnergyMonitoringLimits } from '../tiers.js'
import { maybeSeedDemoForUser } from './_seed.js'

const router = Router()

const alertTypeEnum = z.enum([
  'high_usage',
  'low_production',
  'unusual_pattern',
  'cost_threshold',
  'peak_demand',
])

const comparisonEnum = z.enum(['above', 'below', 'equal', 'average_above'])

const createRuleSchema = z.object({
  name: z.string().min(1).optional(),
  meter_id: z.string().nullable().optional(),
  type: alertTypeEnum,
  threshold: z.number().nonnegative(),
  comparison: comparisonEnum.optional(),
  notify_email: z.string().email().optional(),
})

const updateRuleSchema = z.object({
  name: z.string().min(1).optional(),
  meter_id: z.string().nullable().optional(),
  type: alertTypeEnum.optional(),
  threshold: z.number().nonnegative().optional(),
  comparison: comparisonEnum.optional(),
  notify_email: z.string().email().nullable().optional(),
  enabled: z.boolean().optional(),
})

/**
 * Resolve the ids of every meter owned by `userId`.
 *
 * Used to scope reading queries to the caller's own meters. Mirrors the
 * module-private helper in `readings.ts` — kept inline here so the alert
 * evaluator never has to fall back to an unscoped query.
 */
async function userMeterIds(userId: string): Promise<string[]> {
  const rows = await findMany<{ id: string }>('meters', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  return rows.map((r) => r.id)
}

/* ------------------------------ alert rows ------------------------------ */

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    await maybeSeedDemoForUser(userId)
    const { status, type, page = '1', limit = '50' } = req.query as Record<string, string>
    const where: Array<{ field: string; operator: '=' | 'in'; value: unknown }> = [
      { field: 'user_id', operator: '=', value: userId },
    ]
    if (status) where.push({ field: 'status', operator: '=', value: status })
    if (type) where.push({ field: 'type', operator: '=', value: type })
    const alerts = await findMany('energy_alerts', {
      where,
      orderBy: [{ field: 'created_at', direction: 'desc' }],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    })
    res.json(alerts)
  } catch (err) {
    logger.error('alerts.list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('energy_alerts', id)
    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found.' }) })
    }
    res.json(alert)
  } catch (err) {
    logger.error('alerts.get', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('energy_alerts', id)
    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found.' }) })
    }
    const result = await updateById('energy_alerts', id, {
      status: 'acknowledged',
      acknowledged_by: userId,
      acknowledged_at: new Date(),
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('alerts.acknowledge', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const alert = await findById<Record<string, unknown>>('energy_alerts', id)
    if (!alert || alert.user_id !== userId) {
      return res
        .status(404)
        .json({ error: t('alerts.notFound', undefined, { defaultValue: 'Alert not found.' }) })
    }
    const result = await updateById('energy_alerts', id, {
      status: 'dismissed',
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('alerts.dismiss', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* ----------------------------- alert rules ------------------------------ */

router.get('/rules/list', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    await maybeSeedDemoForUser(userId)
    const rules = await findMany('alert_rules', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'created_at', direction: 'desc' }],
    })
    res.json(rules)
  } catch (err) {
    logger.error('alerts.rules_list', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/rules',
  enforceLimit<EnergyMonitoringLimits>({
    limitType: 'maxAlerts',
    getLimit: (limits) => limits.maxAlerts,
    getCurrent: async (userId) =>
      count('alert_rules', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createRuleSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })

      const { name, meter_id, type, threshold, comparison, notify_email } = req.body
      // If meter_id was provided, ensure the user owns that meter.
      if (meter_id) {
        const meter = await findById<Record<string, unknown>>('meters', meter_id)
        if (!meter || meter.user_id !== userId) {
          return res
            .status(404)
            .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
        }
      }
      const result = await create('alert_rules', {
        user_id: userId,
        name: name ?? type,
        meter_id: meter_id ?? null,
        type,
        threshold: Number(threshold),
        comparison: comparison ?? 'above',
        notify_email: notify_email ?? null,
        enabled: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (err) {
      logger.error('alerts.rule_create', err)
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/rules/:id', validateBody(updateRuleSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('alert_rules', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('alerts.ruleNotFound', undefined, { defaultValue: 'Alert rule not found.' }),
      })
    }
    // updateRuleSchema allows `meter_id` — re-verify ownership so a rule can't be
    // repointed at another user's meter (which the evaluator would then read).
    if (req.body.meter_id != null) {
      const meter = await findById<Record<string, unknown>>('meters', String(req.body.meter_id))
      if (!meter || meter.user_id !== userId) {
        return res
          .status(404)
          .json({ error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }) })
      }
    }
    const result = await updateById('alert_rules', id, {
      ...req.body,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('alerts.rule_update', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const rule = await findById<Record<string, unknown>>('alert_rules', id)
    if (!rule || rule.user_id !== userId) {
      return res.status(404).json({
        error: t('alerts.ruleNotFound', undefined, { defaultValue: 'Alert rule not found.' }),
      })
    }
    const result = await updateById('alert_rules', id, {
      enabled: !rule.enabled,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (err) {
    logger.error('alerts.rule_toggle', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    const id = getParamId(req)
    const rule = await findById<Record<string, unknown>>('alert_rules', id)
    if (!rule || rule.user_id !== userId) {
      return res.status(404).json({
        error: t('alerts.ruleNotFound', undefined, { defaultValue: 'Alert rule not found.' }),
      })
    }
    await deleteById('alert_rules', id)
    res.status(204).end()
  } catch (err) {
    logger.error('alerts.rule_delete', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

/* --------------------- evaluator (manual + cron-driven) ---------------- */

router.post('/check', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })

    // Make /check usable from a fresh signup: the seed installs the
    // owner's default high-usage / low-production rules and 7d of
    // readings. Without this guard, a caller hitting /check before any
    // GET on alerts/meters runs evaluation against an empty rule set
    // and returns alerts_created=0.
    await maybeSeedDemoForUser(userId)

    const rules = await findMany<Record<string, unknown>>('alert_rules', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'enabled', operator: '=', value: true },
      ],
    })
    // Resolve the caller's own meters once so every reading query stays scoped
    // to this tenant. NEVER issue findMany('readings', { where: [] }) — an empty
    // filter reads every tenant's readings.
    const ownedMeterIds = await userMeterIds(userId)
    // The user's most-recent electricity rate — used to evaluate cost_threshold alerts in dollars.
    const ratePlans = await findMany<Record<string, unknown>>('rate_plans', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'effective_date', direction: 'desc' }],
      limit: 1,
    })
    const ratePerKwh = Number(ratePlans[0]?.rate_per_kwh ?? 0)
    const created: unknown[] = []
    for (const rule of rules) {
      const ruleMeterId = rule.meter_id ? String(rule.meter_id) : null
      let meterFilter: Array<{ field: string; operator: '=' | 'in'; value: unknown }>
      if (ruleMeterId) {
        // Re-verify the rule's meter still belongs to the caller at check time
        // (defense in depth — a rule could have been created/repointed earlier).
        if (!ownedMeterIds.includes(ruleMeterId)) continue
        meterFilter = [{ field: 'meter_id', operator: '=', value: ruleMeterId }]
      } else {
        // 'across all MY meters' semantics: scope to the caller's meter ids.
        // If the caller has no meters, skip — never send an empty-array filter.
        if (ownedMeterIds.length === 0) continue
        meterFilter = [{ field: 'meter_id', operator: 'in', value: ownedMeterIds }]
      }
      const readings = await findMany<Record<string, unknown>>('readings', {
        where: meterFilter,
        orderBy: [{ field: 'timestamp', direction: 'desc' }],
        limit: 288,
      })
      if (readings.length === 0) continue

      const values = readings.map((r) => Number(r.value))
      const total = values.reduce((s, v) => s + v, 0)
      const avg = total / values.length
      // The metric each alert type actually evaluates — this was ignored, so every type compared the
      // raw summed kWh: a `cost_threshold` rule (a dollar limit) and a `peak_demand` rule (a peak-kW
      // limit) both mis-fired against the kWh sum. cost = kWh x the user's rate; peak = the single
      // highest reading; the usage types keep the summed kWh.
      let metric = total
      if (rule.type === 'peak_demand') metric = Math.max(...values)
      else if (rule.type === 'cost_threshold') metric = total * ratePerKwh
      const threshold = Number(rule.threshold)
      const cmp = String(rule.comparison ?? 'above')
      const evaluated = cmp === 'average_above' ? avg : metric
      let triggered = false
      if (cmp === 'above') triggered = metric > threshold
      else if (cmp === 'below') triggered = metric < threshold
      else if (cmp === 'equal') triggered = metric === threshold
      else if (cmp === 'average_above') triggered = avg > threshold
      if (!triggered) continue

      const message = t(
        'alerts.thresholdExceeded',
        { type: String(rule.type), value: evaluated.toFixed(2), threshold: String(threshold) },
        {
          defaultValue: '{{type}}: value ({{value}}) crossed threshold ({{threshold}})',
        },
      )

      const result = await create('energy_alerts', {
        user_id: userId,
        rule_id: rule.id,
        meter_id: rule.meter_id ?? null,
        type: rule.type,
        severity: 'warning',
        message,
        status: 'open',
        value: evaluated,
        threshold,
        created_at: new Date(),
        updated_at: new Date(),
      })

      if (rule.notify_email) {
        try {
          await sendMail({
            from: process.env.EMAIL_FROM ?? `no-reply@${process.env.MAILGUN_DOMAIN ?? 'localhost'}`,
            to: String(rule.notify_email),
            subject: t(
              'alerts.emailSubject',
              { type: String(rule.type) },
              { defaultValue: 'Energy Alert: {{type}}' },
            ),
            text: message,
          })
        } catch (notifyErr) {
          // email failure must not break alert creation
          logger.error('alerts.notify', notifyErr)
        }
      }

      created.push((result as { data: unknown }).data)
    }
    res.json({ alerts_created: created.length, alerts: created })
  } catch (err) {
    logger.error('alerts.check', err)
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
