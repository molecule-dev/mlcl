import { type Request, type Response, Router } from 'express'

import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import { authorizers } from '@molecule/api-resource-user'

import { seedDemoForUser } from './_seed.js'

const router = Router()

router.use(authorizers.auth())

interface FleetStats {
  vehicles_total: number
  vehicles_in_transit: number
  vehicles_idle: number
  vehicles_alert: number
  vehicles_offline: number
  drivers_active: number
  miles_today: number
  fuel_used_today: number
  active_alerts: number
}

// /api/reports/fleet — top-of-dashboard KPIs.
router.get('/fleet', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)

    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const drivers = await findMany('drivers', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const alerts = await findMany('alerts', {
      where: [
        { field: 'owner_id', operator: '=', value: userId },
        { field: 'acknowledged_at', operator: 'is_null', value: null },
      ],
    })
    const trips = await findMany('trips', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })

    const status = (v: Record<string, unknown>): string => String(v.status ?? '')
    const stats: FleetStats = {
      vehicles_total: vehicles.length,
      vehicles_in_transit: vehicles.filter(
        (v) => status(v as Record<string, unknown>) === 'in_transit',
      ).length,
      vehicles_idle: vehicles.filter((v) => status(v as Record<string, unknown>) === 'idle').length,
      vehicles_alert: vehicles.filter((v) => status(v as Record<string, unknown>) === 'alert')
        .length,
      vehicles_offline: vehicles.filter((v) => status(v as Record<string, unknown>) === 'offline')
        .length,
      drivers_active: drivers.filter((d) => {
        const s = String((d as Record<string, unknown>).status ?? '')
        return s === 'on_duty' || s === 'on_break'
      }).length,
      miles_today: 0,
      fuel_used_today: 0,
      active_alerts: alerts.length,
    }

    // Sum trips that started in the last 24h.
    const todayCutoff = Date.now() - 24 * 60 * 60 * 1000
    let kmToday = 0
    let litersToday = 0
    for (const tt of trips as Array<Record<string, unknown>>) {
      const startedAt = String(tt.started_at ?? '')
      if (!startedAt) continue
      if (Date.parse(startedAt) >= todayCutoff) {
        kmToday += Number(tt.distance_km ?? 0)
        litersToday += Number(tt.fuel_used_liters ?? 0)
      }
    }
    stats.miles_today = Math.round(kmToday * 0.621371)
    stats.fuel_used_today = Math.round((litersToday / 3.785412) * 10) / 10

    res.json(stats)
  } catch (err) {
    logger.error('[reports] fleet failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

// /api/reports/analytics — 30-day rollups for the Reports page + Dashboard sparkline.
router.get('/analytics', async (_req: Request, res: Response) => {
  try {
    const userId = res.locals.session.userId as string
    await seedDemoForUser(userId)

    const vehicles = await findMany('vehicles', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const trips = await findMany('trips', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })
    const alerts = await findMany('alerts', {
      where: [{ field: 'owner_id', operator: '=', value: userId }],
    })

    const now = new Date()
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    const cutoff = now.getTime() - thirtyDaysMs

    let miles_30d_km = 0
    let fuel_30d_l = 0
    let hours_30d_s = 0
    let alerts_30d = 0

    const dayBucket = new Map<string, number>()
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      dayBucket.set(key, 0)
    }

    for (const tt of trips as Array<Record<string, unknown>>) {
      const startedAt = String(tt.started_at ?? '')
      if (!startedAt) continue
      const ts = Date.parse(startedAt)
      if (Number.isNaN(ts) || ts < cutoff) continue
      const km = Number(tt.distance_km ?? 0)
      const liters = Number(tt.fuel_used_liters ?? 0)
      const dur = Number(tt.duration_seconds ?? 0)
      miles_30d_km += km
      fuel_30d_l += liters
      hours_30d_s += dur
      const key = new Date(ts).toISOString().slice(0, 10)
      if (dayBucket.has(key)) {
        dayBucket.set(key, (dayBucket.get(key) ?? 0) + km)
      }
    }

    for (const a of alerts as Array<Record<string, unknown>>) {
      const occurredAt = String(a.occurred_at ?? a.created_at ?? '')
      if (!occurredAt) continue
      if (Date.parse(occurredAt) >= cutoff) alerts_30d += 1
    }

    const miles_30d = Math.round(miles_30d_km * 0.621371)
    const fuel_30d_gal = Math.round(fuel_30d_l / 3.785412)
    const fuelCostPerGal = 4.25
    const fuel_cost_30d = Math.round(fuel_30d_gal * fuelCostPerGal)
    const hours_30d = Math.round((hours_30d_s / 3600) * 10) / 10

    const daily_miles = Array.from(dayBucket.entries()).map(([date, km]) => ({
      date,
      miles: Math.round(km * 0.621371),
    }))

    // Group vehicles by type with derived per-type miles/fuel from trips.
    const typeAgg = new Map<string, { count: number; miles_km: number; liters: number }>()
    const vehicleType = new Map<string, string>()
    for (const v of vehicles as Array<Record<string, unknown>>) {
      const id = String(v.id ?? '')
      const tp = String(v.type ?? 'other')
      vehicleType.set(id, tp)
      const cur = typeAgg.get(tp) ?? { count: 0, miles_km: 0, liters: 0 }
      cur.count += 1
      typeAgg.set(tp, cur)
    }
    for (const tt of trips as Array<Record<string, unknown>>) {
      const startedAt = String(tt.started_at ?? '')
      if (!startedAt || Date.parse(startedAt) < cutoff) continue
      const vid = String(tt.vehicle_id ?? '')
      const tp = vehicleType.get(vid) ?? 'other'
      const cur = typeAgg.get(tp) ?? { count: 0, miles_km: 0, liters: 0 }
      cur.miles_km += Number(tt.distance_km ?? 0)
      cur.liters += Number(tt.fuel_used_liters ?? 0)
      typeAgg.set(tp, cur)
    }
    const by_vehicle_type = Array.from(typeAgg.entries()).map(([type, agg]) => ({
      type,
      count: agg.count,
      miles: Math.round(agg.miles_km * 0.621371),
      fuel_gal: Math.max(1, Math.round(agg.liters / 3.785412)),
    }))

    res.json({
      miles_30d,
      fuel_30d_gal,
      fuel_cost_30d,
      hours_30d,
      alerts_30d,
      on_time_rate: 0.92,
      by_vehicle_type,
      daily_miles,
    })
  } catch (err) {
    logger.error('[reports] analytics failed', err)
    res
      .status(500)
      .json({ error: t('common.serverError', {}, { defaultValue: 'Internal server error' }) })
  }
})

export default router
