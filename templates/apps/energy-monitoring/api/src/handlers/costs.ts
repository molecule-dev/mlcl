/**
 * Cost / rate-plan handler.
 *
 * All queries are scoped by `user_id`. Calculation endpoints accept a
 * `meter_id` query param and verify ownership before aggregating readings.
 *
 * @module
 */
import { type Request, type RequestHandler, type Response, Router } from 'express'
import { z } from 'zod'

import { getParamId, getUserId } from '@molecule/api-bonds-default-express'
import { count, create, deleteById, findById, findMany, updateById } from '@molecule/api-database'
import { enforceLimit } from '@molecule/api-entitlements'
import { t } from '@molecule/api-i18n'
import { validateBody, validateQuery } from '@molecule/api-middleware-validation'

import type { EnergyMonitoringLimits } from '../tiers.js'
import { maybeSeedDemoForUser } from './_seed.js'

const router = Router()

const createRateSchema = z.object({
  name: z.string().min(1),
  rate_per_kwh: z.number().nonnegative(),
  peak_rate: z.number().nonnegative().optional(),
  off_peak_rate: z.number().nonnegative().optional(),
  peak_start_hour: z.number().int().min(0).max(23).optional(),
  peak_end_hour: z.number().int().min(0).max(23).optional(),
  currency: z.string().optional(),
  effective_date: z.string().optional(),
})

const updateRateSchema = z.object({
  name: z.string().min(1).optional(),
  rate_per_kwh: z.number().nonnegative().optional(),
  peak_rate: z.number().nonnegative().nullable().optional(),
  off_peak_rate: z.number().nonnegative().nullable().optional(),
  peak_start_hour: z.number().int().min(0).max(23).nullable().optional(),
  peak_end_hour: z.number().int().min(0).max(23).nullable().optional(),
  currency: z.string().optional(),
  effective_date: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
})

const calculateQuerySchema = z.object({
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  meter_id: z.string().optional(),
  rate_plan_id: z.string().optional(),
})

const monthlyQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  meter_id: z.string().optional(),
})

router.get('/rates', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    await maybeSeedDemoForUser(userId)
    const rates = await findMany('rate_plans', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      orderBy: [{ field: 'effective_date', direction: 'desc' }],
    })
    res.json(rates)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.get('/rates/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    const id = getParamId(req)
    const rate = await findById<Record<string, unknown>>('rate_plans', id)
    if (!rate || rate.user_id !== userId) {
      return res.status(404).json({
        error: t('costs.rateNotFound', undefined, { defaultValue: 'Rate plan not found.' }),
      })
    }
    res.json(rate)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.post(
  '/rates',
  enforceLimit<EnergyMonitoringLimits>({
    limitType: 'maxCosts',
    getLimit: (limits) => limits.maxCosts,
    getCurrent: async (userId) =>
      count('rate_plans', [{ field: 'user_id', operator: '=', value: userId }]),
  }) as unknown as RequestHandler,
  validateBody(createRateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      const {
        name,
        rate_per_kwh,
        peak_rate,
        off_peak_rate,
        peak_start_hour,
        peak_end_hour,
        currency,
        effective_date,
      } = req.body
      const result = await create('rate_plans', {
        user_id: userId,
        name,
        rate_per_kwh: Number(rate_per_kwh),
        peak_rate: peak_rate != null ? Number(peak_rate) : null,
        off_peak_rate: off_peak_rate != null ? Number(off_peak_rate) : null,
        peak_start_hour: peak_start_hour != null ? Number(peak_start_hour) : null,
        peak_end_hour: peak_end_hour != null ? Number(peak_end_hour) : null,
        currency: currency ?? 'USD',
        effective_date: effective_date ? new Date(effective_date) : new Date(),
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      })
      res.status(201).json(result.data)
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.put('/rates/:id', validateBody(updateRateSchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('rate_plans', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('costs.rateNotFound', undefined, { defaultValue: 'Rate plan not found.' }),
      })
    }
    const result = await updateById('rate_plans', id, {
      ...req.body,
      updated_at: new Date(),
    })
    res.json(result.data)
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

router.delete('/rates/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    const id = getParamId(req)
    const existing = await findById<Record<string, unknown>>('rate_plans', id)
    if (!existing || existing.user_id !== userId) {
      return res.status(404).json({
        error: t('costs.rateNotFound', undefined, { defaultValue: 'Rate plan not found.' }),
      })
    }
    await deleteById('rate_plans', id)
    res.status(204).end()
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

async function ownsMeter(userId: string, meterId: string): Promise<boolean> {
  const meter = await findById<Record<string, unknown>>('meters', meterId)
  return !!meter && meter.user_id === userId
}

async function userMeterIds(userId: string): Promise<string[]> {
  const rows = await findMany<{ id: string }>('meters', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 10_000,
  })
  return rows.map((r) => r.id)
}

router.get(
  '/calculate',
  validateQuery(calculateQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const userId = getUserId(res)
      if (!userId)
        return res.status(401).json({
          error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
        })
      await maybeSeedDemoForUser(userId)
      const { meter_id, rate_plan_id, start_date, end_date } = req.query as unknown as z.infer<
        typeof calculateQuerySchema
      >

      const meterIds = meter_id
        ? (await ownsMeter(userId, meter_id))
          ? [meter_id]
          : []
        : await userMeterIds(userId)
      if (meterIds.length === 0) {
        // Empty result for users without meters — caller can choose to render
        // an empty state rather than treating this as a hard error.
        return res.json({
          total_cost: 0,
          total_usage: 0,
          peak_usage: 0,
          off_peak_usage: 0,
          rate_plan: null,
          currency: 'USD',
          start_date,
          end_date,
        })
      }

      let ratePlan: Record<string, unknown> | null = null
      if (rate_plan_id) {
        const candidate = await findById<Record<string, unknown>>('rate_plans', rate_plan_id)
        if (!candidate || candidate.user_id !== userId) {
          return res.status(404).json({
            error: t('costs.rateNotFound', undefined, { defaultValue: 'Rate plan not found.' }),
          })
        }
        ratePlan = candidate
      } else {
        const active = await findMany<Record<string, unknown>>('rate_plans', {
          where: [
            { field: 'user_id', operator: '=', value: userId },
            { field: 'status', operator: '=', value: 'active' },
          ],
          orderBy: [{ field: 'effective_date', direction: 'desc' }],
          limit: 1,
        })
        ratePlan = active[0] ?? null
      }
      if (!ratePlan) {
        return res.json({
          total_cost: 0,
          total_usage: 0,
          peak_usage: 0,
          off_peak_usage: 0,
          rate_plan: null,
          currency: 'USD',
          start_date,
          end_date,
        })
      }

      const readings = await findMany<Record<string, unknown>>('readings', {
        where: [{ field: 'meter_id', operator: 'in', value: meterIds }],
        orderBy: [{ field: 'timestamp', direction: 'asc' }],
        limit: 100_000,
      })
      const start = new Date(start_date)
      const end = new Date(end_date)
      let totalCost = 0
      let peak = 0
      let off = 0
      let total = 0
      for (const r of readings) {
        const ts = new Date(String(r.timestamp))
        if (ts < start || ts > end) continue
        const v = Number(r.value)
        total += v
        if (
          ratePlan.peak_rate &&
          ratePlan.peak_start_hour != null &&
          ratePlan.peak_end_hour != null
        ) {
          const h = ts.getHours()
          if (h >= Number(ratePlan.peak_start_hour) && h < Number(ratePlan.peak_end_hour)) {
            totalCost += v * Number(ratePlan.peak_rate)
            peak += v
          } else {
            totalCost += v * Number(ratePlan.off_peak_rate ?? ratePlan.rate_per_kwh)
            off += v
          }
        } else {
          totalCost += v * Number(ratePlan.rate_per_kwh)
        }
      }
      res.json({
        total_cost: Math.round(totalCost * 100) / 100,
        total_usage: total,
        peak_usage: peak,
        off_peak_usage: off,
        rate_plan: ratePlan.name,
        currency: ratePlan.currency ?? 'USD',
        start_date,
        end_date,
      })
    } catch (_err) {
      res.status(500).json({
        error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
      })
    }
  },
)

router.get('/monthly', validateQuery(monthlyQuerySchema), async (req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId)
      return res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
    const { meter_id, year } = req.query as unknown as z.infer<typeof monthlyQuerySchema>
    const targetYear = year ?? new Date().getFullYear()

    const meterIds = meter_id
      ? (await ownsMeter(userId, meter_id))
        ? [meter_id]
        : []
      : await userMeterIds(userId)
    if (meterIds.length === 0) {
      return res.status(404).json({
        error: t('meters.notFound', undefined, { defaultValue: 'Meter not found.' }),
      })
    }

    const active = await findMany<Record<string, unknown>>('rate_plans', {
      where: [
        { field: 'user_id', operator: '=', value: userId },
        { field: 'status', operator: '=', value: 'active' },
      ],
      orderBy: [{ field: 'effective_date', direction: 'desc' }],
      limit: 1,
    })
    const ratePlan = active[0]
    if (!ratePlan) {
      return res.status(404).json({
        error: t('costs.noRatePlan', undefined, { defaultValue: 'No active rate plan found.' }),
      })
    }
    const readings = await findMany<Record<string, unknown>>('readings', {
      where: [{ field: 'meter_id', operator: 'in', value: meterIds }],
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
      limit: 100_000,
    })
    const monthlyMap: Record<string, { usage: number; cost: number }> = {}
    for (const r of readings) {
      const ts = new Date(String(r.timestamp))
      if (ts.getFullYear() !== targetYear) continue
      const key = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, '0')}`
      const bucket = monthlyMap[key] ?? { usage: 0, cost: 0 }
      const v = Number(r.value)
      bucket.usage += v
      if (
        ratePlan.peak_rate &&
        ratePlan.peak_start_hour != null &&
        ratePlan.peak_end_hour != null
      ) {
        const h = ts.getHours()
        if (h >= Number(ratePlan.peak_start_hour) && h < Number(ratePlan.peak_end_hour)) {
          bucket.cost += v * Number(ratePlan.peak_rate)
        } else {
          bucket.cost += v * Number(ratePlan.off_peak_rate ?? ratePlan.rate_per_kwh)
        }
      } else {
        bucket.cost += v * Number(ratePlan.rate_per_kwh)
      }
      monthlyMap[key] = bucket
    }
    const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      usage: data.usage,
      cost: Math.round(data.cost * 100) / 100,
      currency: ratePlan.currency ?? 'USD',
    }))
    res.json({ year: targetYear, months: monthly, rate_plan: ratePlan.name })
  } catch (_err) {
    res.status(500).json({
      error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error.' }),
    })
  }
})

export default router
