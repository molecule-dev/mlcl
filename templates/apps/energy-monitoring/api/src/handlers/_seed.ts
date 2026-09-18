/**
 * energy-monitoring — per-user demo seeding.
 *
 * On first authenticated request from a user this module checks whether
 * the user has any meters yet. If not, it seeds:
 *
 *   - 3 meters (Grid, Solar, Battery)
 *   - A default time-of-use rate plan
 *   - 7 days of hourly readings per meter (≈ 504 readings total)
 *   - 2 alert rules (high usage + low production)
 *
 * Each reading.value is kWh consumed/produced during that hour bucket;
 * watts ≈ value * 1000. The seed is gated on count(meters) so subsequent
 * calls become a no-op. Concurrent calls are guarded with an in-memory
 * promise map.
 */

import { count, create, findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

const seededUsers = new Set<string>()
const seedingInFlight = new Map<string, Promise<void>>()

const HOUR_MS = 3_600_000

/** Hourly grid kWh: heavier 7-9am and 5-9pm, light overnight. */
function gridKwhAt(hour: number): number {
  if (hour >= 7 && hour <= 9) return 1.4 + (hour - 7) * 0.15
  if (hour >= 17 && hour <= 21) return 1.6 + Math.sin(((hour - 17) / 4) * Math.PI) * 0.7
  if (hour >= 12 && hour <= 14) return 0.7
  if (hour >= 22 || hour <= 5) return 0.35
  return 0.6
}

/** Hourly solar kWh: parabolic, peak around solar noon. */
function solarKwhAt(hour: number): number {
  if (hour < 6 || hour > 19) return 0
  const t = (hour - 6) / 13
  return Math.max(0, 3.4 * Math.sin(t * Math.PI))
}

/** Hourly battery kWh: charge from solar surplus midday, discharge evening. */
function batteryKwhAt(hour: number): number {
  if (hour >= 11 && hour <= 14) return -0.6
  if (hour >= 18 && hour <= 21) return 0.5
  return 0
}

interface CreatedIdResult {
  data?: { id?: string }
}

function takeId(result: unknown): string | null {
  const r = result as CreatedIdResult
  return r?.data?.id ?? null
}

/**
 * Seed demo content for a single user, idempotently. Returns immediately
 * if the user is already seeded.
 */
export async function seedDemoForUser(userId: string): Promise<void> {
  if (seededUsers.has(userId)) return

  const inFlight = seedingInFlight.get(userId)
  if (inFlight) return inFlight

  const promise = (async () => {
    const existing = await count('meters', [{ field: 'user_id', operator: '=', value: userId }])
    if (existing > 0) {
      seededUsers.add(userId)
      return
    }

    const now = new Date()

    // Meters
    const meterSeeds: Array<{
      name: string
      type: 'grid' | 'solar' | 'battery'
      location: string
      description: string
      hourlyFn: (hour: number) => number
    }> = [
      {
        name: 'Whole-home grid',
        type: 'grid',
        location: 'Main panel',
        description: 'Smart meter on the utility feed.',
        hourlyFn: gridKwhAt,
      },
      {
        name: 'Roof array',
        type: 'solar',
        location: 'South roof',
        description: '8.2 kWp PV array via Enphase microinverters.',
        hourlyFn: solarKwhAt,
      },
      {
        name: 'Powerwall stack',
        type: 'battery',
        location: 'Garage',
        description: '13.5 kWh storage; positive = discharge to home.',
        hourlyFn: batteryKwhAt,
      },
    ]

    const meterIds: Array<{ id: string; type: string; hourlyFn: (h: number) => number }> = []
    for (const m of meterSeeds) {
      const result = await create('meters', {
        user_id: userId,
        name: m.name,
        type: m.type,
        location: m.location,
        unit: 'kWh',
        description: m.description,
        status: 'active',
        created_at: now,
        updated_at: now,
      })
      const id = takeId(result)
      if (id) meterIds.push({ id, type: m.type, hourlyFn: m.hourlyFn })
    }

    // 7 days of hourly readings per meter
    const DAYS = 7
    const HOURS = 24
    for (const meter of meterIds) {
      for (let d = DAYS - 1; d >= 0; d--) {
        for (let h = 0; h < HOURS; h++) {
          const ts = new Date(now.getTime() - (d * HOURS + (HOURS - 1 - h)) * HOUR_MS)
          if (ts > now) continue
          const variance = 0.85 + ((d + h) % 7) * 0.04
          const value = meter.hourlyFn(ts.getHours()) * variance
          await create('readings', {
            meter_id: meter.id,
            value: Number(value.toFixed(4)),
            unit: 'kWh',
            timestamp: ts,
            created_at: ts,
          })
        }
      }
    }

    // Default rate plan
    await create('rate_plans', {
      user_id: userId,
      name: 'Time-of-use (default)',
      rate_per_kwh: 0.18,
      peak_rate: 0.32,
      off_peak_rate: 0.14,
      peak_start_hour: 16,
      peak_end_hour: 21,
      currency: 'USD',
      effective_date: now,
      status: 'active',
      created_at: now,
      updated_at: now,
    })

    // Resolve grid meter id for default alert rules
    const gridMeter = meterIds.find((m) => m.type === 'grid')
    const solarMeter = meterIds.find((m) => m.type === 'solar')

    if (gridMeter) {
      await create('alert_rules', {
        user_id: userId,
        name: 'High whole-home draw',
        meter_id: gridMeter.id,
        type: 'high_usage',
        threshold: 30,
        comparison: 'above',
        notify_email: null,
        enabled: true,
        created_at: now,
        updated_at: now,
      })
    }
    if (solarMeter) {
      await create('alert_rules', {
        user_id: userId,
        name: 'Solar underperformance',
        meter_id: solarMeter.id,
        type: 'low_production',
        threshold: 10,
        comparison: 'below',
        notify_email: null,
        enabled: true,
        created_at: now,
        updated_at: now,
      })
    }

    seededUsers.add(userId)
  })()

  seedingInFlight.set(userId, promise)
  try {
    await promise
  } catch (err) {
    logger.error('[energy-monitoring/_seed] Failed to seed demo data:', err)
    throw err
  } finally {
    seedingInFlight.delete(userId)
  }
}

/**
 * Best-effort wrapper that swallows seeding failures so a transient seed
 * error never blocks a list request. Callers should still await it before
 * issuing their own queries so the seeded rows are visible.
 */
export async function maybeSeedDemoForUser(userId: string): Promise<void> {
  try {
    await seedDemoForUser(userId)
  } catch (_error) {
    // swallow — seeding is best-effort and must not block list requests
  }
}

/** Helper for tests / handlers that want to know if seeding has completed. */
export async function userHasMeters(userId: string): Promise<boolean> {
  const rows = await findMany<{ id: string }>('meters', {
    where: [{ field: 'user_id', operator: '=', value: userId }],
    limit: 1,
  })
  return rows.length > 0
}
