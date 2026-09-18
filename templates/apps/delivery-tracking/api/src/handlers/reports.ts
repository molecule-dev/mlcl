/**
 * Reports / analytics handler. Aggregates shipment + alert data for the
 * Dashboard and Analytics pages from real DB rows.
 *
 * @module
 */

import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

import type { CarrierRow, ShipmentRow } from '../lib/decorate.js'
import { seedDemoForUser } from './_seed.js'

const router = Router()

const MS_PER_DAY = 86_400_000

function fail(res: Response, where: string, err: unknown): void {
  logger.error?.(`reports.${where} failed: ${(err as Error)?.stack ?? err}`)
  res.status(500).json({
    error: t('errors.internalServer', undefined, { defaultValue: 'Internal server error' }),
  })
}

router.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    try {
      await seedDemoForUser(userId)
    } catch (err) {
      logger.warn?.(`seed failed: ${(err as Error).message}`)
    }
    const shipments = await findMany<ShipmentRow>('shipments', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 10_000,
    })
    const now = Date.now()
    const todayStart = new Date(now - (now % MS_PER_DAY)).getTime()
    const sevenDaysAgo = now - 7 * MS_PER_DAY

    let in_transit = 0
    let in_transit_recent = 0
    let in_transit_prior = 0
    let delivered_today = 0
    let delivered_recent = 0
    let delivered_prior = 0
    let exception_count = 0
    let on_time = 0
    const carrierIds = new Set<string>()

    for (const s of shipments) {
      const created = new Date(s.created_at).getTime()
      const delivered = s.delivered_at ? new Date(s.delivered_at).getTime() : null
      if (s.carrier_id) carrierIds.add(s.carrier_id)
      if (
        s.status === 'in_transit' ||
        s.status === 'out_for_delivery' ||
        s.status === 'picked_up'
      ) {
        in_transit++
        if (created >= sevenDaysAgo) in_transit_recent++
        else in_transit_prior++
      }
      if (s.status === 'exception') exception_count++
      if (delivered != null) {
        if (delivered >= todayStart) delivered_today++
        if (delivered >= sevenDaysAgo) delivered_recent++
        else delivered_prior++
        if (
          s.expected_delivery &&
          delivered <= new Date(s.expected_delivery).getTime() + MS_PER_DAY
        ) {
          on_time++
        }
      }
    }

    const denominator = Math.max(shipments.length, 1)
    const exception_rate = (exception_count / denominator) * 100
    const total_delivered = delivered_recent + delivered_prior
    const on_time_rate = total_delivered > 0 ? on_time / total_delivered : 1

    const in_transit_change_pct =
      in_transit_prior > 0 ? ((in_transit_recent - in_transit_prior) / in_transit_prior) * 100 : 0
    const delivered_today_change_pct =
      delivered_prior > 0 ? ((delivered_recent - delivered_prior) / delivered_prior) * 100 : 0

    res.json({
      in_transit,
      in_transit_change_pct,
      delivered_today,
      delivered_today_change_pct,
      exception_rate,
      on_time_rate,
      active_carriers: carrierIds.size,
    })
  } catch (err) {
    fail(res, 'dashboard', err)
  }
})

router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const userId = getUserId(res)
    if (!userId) {
      res.status(401).json({
        error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
      })
      return
    }
    const sinceMs = Date.now() - 30 * MS_PER_DAY
    const shipments = await findMany<ShipmentRow>('shipments', {
      where: [{ field: 'user_id', operator: '=', value: userId }],
      limit: 10_000,
    })
    const recent = shipments.filter((s) => new Date(s.created_at).getTime() >= sinceMs)

    let on_time = 0
    let on_time_total = 0
    let exception_count = 0
    let total_transit_hours = 0
    let total_transit_count = 0
    const byCarrier = new Map<string, { shipments: number; on_time: number; exception: number }>()
    const byStatus = new Map<string, number>()
    const byDay = new Map<string, { volume: number; on_time_volume: number }>()

    const dayKey = (ms: number): string => new Date(ms).toISOString().slice(0, 10)

    for (let i = 29; i >= 0; i--)
      byDay.set(dayKey(Date.now() - i * MS_PER_DAY), { volume: 0, on_time_volume: 0 })

    for (const s of recent) {
      const created = new Date(s.created_at).getTime()
      const delivered = s.delivered_at ? new Date(s.delivered_at).getTime() : null
      const carrierKey = s.carrier_id ?? 'unknown'
      const carrierAgg = byCarrier.get(carrierKey) ?? { shipments: 0, on_time: 0, exception: 0 }
      carrierAgg.shipments++
      if (s.status === 'exception') {
        exception_count++
        carrierAgg.exception++
      }
      const isOnTime =
        delivered != null &&
        s.expected_delivery &&
        delivered <= new Date(s.expected_delivery).getTime() + MS_PER_DAY
      if (delivered != null) {
        on_time_total++
        if (isOnTime) {
          on_time++
          carrierAgg.on_time++
        }
        const transitHours = (delivered - created) / 3_600_000
        if (transitHours > 0 && transitHours < 24 * 14) {
          total_transit_hours += transitHours
          total_transit_count++
        }
      }
      byCarrier.set(carrierKey, carrierAgg)
      byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1)
      const k = dayKey(created)
      const day = byDay.get(k) ?? { volume: 0, on_time_volume: 0 }
      day.volume++
      if (isOnTime) day.on_time_volume++
      byDay.set(k, day)
    }

    const denominator = Math.max(recent.length, 1)
    const on_time_rate_overall = on_time_total > 0 ? on_time / on_time_total : 1
    const exception_rate_overall = exception_count / denominator
    const avg_transit_hours =
      total_transit_count > 0 ? Math.round(total_transit_hours / total_transit_count) : 0

    const carrierIds = [...byCarrier.keys()].filter((k) => k !== 'unknown')
    const carrierMap = new Map<string, string>()
    if (carrierIds.length > 0) {
      const rows = await findMany<CarrierRow>('carriers', {
        where: [{ field: 'id', operator: 'in', value: carrierIds }],
        limit: carrierIds.length,
      })
      for (const r of rows) carrierMap.set(r.id, r.name)
    }

    const by_carrier = [...byCarrier.entries()].map(([id, agg]) => ({
      carrier: carrierMap.get(id) ?? 'Unknown',
      shipments: agg.shipments,
      on_time_rate: agg.on_time / Math.max(agg.shipments, 1),
      exception_rate: agg.exception / Math.max(agg.shipments, 1),
    }))

    const by_status_30d = [...byStatus.entries()].map(([status, c]) => ({
      status,
      count: c,
      pct: c / denominator,
    }))

    const daily_volume = [...byDay.entries()].map(([date, v]) => ({
      date,
      volume: v.volume,
      on_time_volume: v.on_time_volume,
    }))

    res.json({
      on_time_rate_overall,
      on_time_rate_change: 0,
      exception_rate_overall,
      exception_rate_change: 0,
      avg_transit_hours,
      total_shipments_30d: recent.length,
      by_carrier,
      by_status_30d,
      daily_volume,
    })
  } catch (err) {
    fail(res, 'analytics', err)
  }
})

export default router
