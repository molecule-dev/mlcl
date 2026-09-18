/**
 * Aggregate reporting endpoints — fleet summary, ingest throughput.
 *
 * All routes are session-authenticated and scoped by `owner_id`. Data is
 * derived from the per-user `iot_devices`, `device_alerts`, `telemetry`,
 * and `firmware_rollouts` tables. The summaries are computed live so the
 * dashboard always reflects the current truth (no cache, no fixtures).
 *
 * @module
 */
import { type Request, type Response, Router } from 'express'

import { getUserId } from '@molecule/api-bonds-default-express'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'

const router = Router()

function unauthorized(res: Response): void {
  res.status(401).json({
    error: t('auth.unauthorized', undefined, { defaultValue: 'Authentication required.' }),
  })
}

router.get('/fleet', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    unauthorized(res)
    return
  }

  const devices = await findMany<Record<string, unknown>>('iot_devices', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 100_000,
  })

  let online = 0
  let warning = 0
  let critical = 0
  let offline = 0
  for (const d of devices) {
    const status = String(d.status ?? 'offline')
    if (status === 'online' || status === 'provisioning') online += 1
    else if (status === 'decommissioned') offline += 1
    else offline += 1
  }

  const alerts = await findMany<Record<string, unknown>>('device_alerts', {
    where: [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'open' },
    ],
    limit: 100_000,
  })
  for (const a of alerts) {
    const sev = String(a.severity ?? 'info')
    if (sev === 'critical' || sev === 'error') critical += 1
    else if (sev === 'warning') warning += 1
  }

  // Throughput: count telemetry points written in the last 60s across the user's devices.
  const deviceIds = devices.map((d) => String(d.id))
  let messages_per_min = 0
  if (deviceIds.length > 0) {
    const since = new Date(Date.now() - 60_000)
    const recent = await findMany<Record<string, unknown>>('telemetry', {
      where: [{ field: 'device_id', operator: 'in', value: deviceIds }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      limit: 5_000,
    })
    messages_per_min = recent.filter((r) => new Date(String(r.recorded_at)) >= since).length
  }

  // Firmware-pending count = active rollouts owned by user.
  const rollouts = await findMany<Record<string, unknown>>('firmware_rollouts', {
    where: [
      { field: 'owner_id', operator: '=', value: userId },
      { field: 'status', operator: '=', value: 'active' },
    ],
    limit: 1_000,
  })
  const firmware_pending = rollouts.length

  res.json({
    devices_total: devices.length,
    devices_online: online,
    devices_warning: warning,
    devices_critical: critical,
    devices_offline: offline,
    active_alerts: alerts.length,
    messages_per_min,
    firmware_pending,
    uptime_pct: devices.length === 0 ? 100 : Number(((online / devices.length) * 100).toFixed(2)),
    as_of: new Date().toISOString(),
  })
})

router.get('/throughput', async (_req: Request, res: Response) => {
  const userId = getUserId(res)
  if (!userId) {
    unauthorized(res)
    return
  }

  const devices = await findMany<{ id: string }>('iot_devices', {
    where: [{ field: 'owner_id', operator: '=', value: userId }],
    limit: 100_000,
  })
  const deviceIds = devices.map((d) => d.id)

  // Per-minute buckets for the last 7 minutes.
  const now = Date.now()
  const buckets: Array<{ start: Date; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const start = new Date(now - (i + 1) * 60_000)
    buckets.push({ start, count: 0 })
  }

  if (deviceIds.length > 0) {
    const earliest = buckets[0].start
    const points = await findMany<Record<string, unknown>>('telemetry', {
      where: [{ field: 'device_id', operator: 'in', value: deviceIds }],
      orderBy: [{ field: 'recorded_at', direction: 'desc' }],
      limit: 50_000,
    })
    for (const p of points) {
      const ts = new Date(String(p.recorded_at))
      if (ts < earliest) continue
      for (let i = 0; i < buckets.length; i++) {
        const bucketEnd = new Date(buckets[i].start.getTime() + 60_000)
        if (ts >= buckets[i].start && ts < bucketEnd) {
          buckets[i].count += 1
          break
        }
      }
    }
  }

  const minutes = buckets.map((b) => ({
    start: b.start.toISOString(),
    count: b.count,
  }))
  const total = minutes.reduce((s, m) => s + m.count, 0)

  res.json({
    minutes,
    messages_per_min: minutes[minutes.length - 1]?.count ?? 0,
    messages_last_7_min: total,
    as_of: new Date().toISOString(),
  })
})

export default router
