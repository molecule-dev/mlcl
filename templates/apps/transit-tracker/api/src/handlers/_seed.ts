/**
 * Demo seed for transit-tracker.
 *
 * Two idempotent layers (guarded by row-count checks so server restarts
 * never double-seed):
 *
 * 1. **Network** (`seedGlobalNetworkIfEmpty`) — loads
 *    api/fixtures/network.json (the fictional city of Averton: 6 lines —
 *    2 metro, 1 tram, 3 bus — 36 stops, ordered positions with per-hop
 *    travel times, headway schedules for both directions) into the
 *    transit_* tables.
 *
 * 2. **Service alerts** (`seedGlobalAlertsIfEmpty`) — loads
 *    api/fixtures/alerts.json. Fixture rows carry day OFFSETS
 *    (starts_days_ago / ends_days_from_now) which are converted to
 *    timestamps AT SEED TIME, so the demo alert set is always "active
 *    now" no matter when the template is first booted.
 *
 * There is no per-user seed: the only user-written table (saved_stops)
 * starts empty by design.
 *
 * @module
 */

import { readFile } from 'node:fs/promises'

import { count, create, query } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

interface NetworkFixture {
  city: string
  lines: Array<{
    code: string
    name: string
    kind: 'metro' | 'bus' | 'tram'
    color: string
    polyline: Array<[number, number]>
  }>
  stops: Array<{ code: string; name: string; lat: number; lng: number; hub: boolean }>
  positions: Array<{
    line_code: string
    stop_code: string
    sequence: number
    travel_seconds_from_prev: number
  }>
  schedules: Array<{
    line_code: string
    direction: 0 | 1
    first_departure: string
    last_departure: string
    headway_seconds: number
  }>
}

interface AlertFixture {
  line_code: string | null
  severity: 'info' | 'warning' | 'severe'
  title: string
  body: string
  starts_days_ago: number
  ends_days_from_now: number
}

/** Resolves api/fixtures/*.json from BOTH src/ (tsx watch) and dist/. */
const NETWORK_FIXTURE_URL = new URL('../../fixtures/network.json', import.meta.url)
const ALERTS_FIXTURE_URL = new URL('../../fixtures/alerts.json', import.meta.url)

async function loadJson<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, 'utf-8')) as T
}

/** Idempotent: skipped once any line exists. Rows are tiny; per-row INSERTs. */
export async function seedGlobalNetworkIfEmpty(): Promise<{ lines: number; stops: number }> {
  const existing = await count('transit_lines', [])
  if (existing > 0) return { lines: 0, stops: 0 }

  const fixture = await loadJson<NetworkFixture>(NETWORK_FIXTURE_URL)
  if (fixture.lines.length === 0 || fixture.stops.length === 0) {
    throw new Error('network fixture empty or malformed')
  }

  for (const stop of fixture.stops) {
    await create('transit_stops', {
      code: stop.code,
      name: stop.name,
      lat: stop.lat,
      lng: stop.lng,
      hub: stop.hub,
      created_at: new Date(),
    })
  }
  for (const line of fixture.lines) {
    // pg driver requires JSONB columns receive a stringified JSON value.
    await query(
      `INSERT INTO public.transit_lines (code, name, kind, color, polyline, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, now())
       ON CONFLICT (code) DO NOTHING`,
      [line.code, line.name, line.kind, line.color, JSON.stringify(line.polyline)],
    )
  }
  for (const position of fixture.positions) {
    await create('transit_stop_positions', {
      line_code: position.line_code,
      stop_code: position.stop_code,
      sequence: position.sequence,
      travel_seconds_from_prev: position.travel_seconds_from_prev,
    })
  }
  for (const schedule of fixture.schedules) {
    await create('transit_schedules', {
      line_code: schedule.line_code,
      direction: schedule.direction,
      first_departure: schedule.first_departure,
      last_departure: schedule.last_departure,
      headway_seconds: schedule.headway_seconds,
    })
  }
  return { lines: fixture.lines.length, stops: fixture.stops.length }
}

/**
 * Idempotent: skipped once any alert exists. Day offsets are anchored to
 * seed time so the demo set is active whenever the template first boots.
 */
export async function seedGlobalAlertsIfEmpty(): Promise<{ alerts: number }> {
  const existing = await count('transit_alerts', [])
  if (existing > 0) return { alerts: 0 }

  const fixtures = await loadJson<AlertFixture[]>(ALERTS_FIXTURE_URL)
  const DAY_MS = 86_400_000
  const now = Date.now()
  for (const alert of fixtures) {
    await create('transit_alerts', {
      line_code: alert.line_code,
      severity: alert.severity,
      title: alert.title,
      body: alert.body,
      starts_at: new Date(now - alert.starts_days_ago * DAY_MS),
      ends_at: new Date(now + alert.ends_days_from_now * DAY_MS),
      created_at: new Date(),
    })
  }
  return { alerts: fixtures.length }
}

/** Both layers, in dependency order. Called at the END of setupBonds(). */
export async function seedGlobalTransitDataIfEmpty(): Promise<void> {
  await seedGlobalNetworkIfEmpty()
  await seedGlobalAlertsIfEmpty()
}

/**
 * Best-effort wrapper used by read handlers so the network seeds on first
 * read after a fresh DB without coupling the seed to server boot. Errors
 * are swallowed so a failed seed doesn't break the read.
 */
export async function ensureSeed(): Promise<void> {
  try {
    await seedGlobalTransitDataIfEmpty()
  } catch (err) {
    logger.warn(err)
  }
}
