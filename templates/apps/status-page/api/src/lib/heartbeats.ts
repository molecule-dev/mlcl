/**
 * Heartbeat (dead-man's-switch) monitors.
 *
 * `status-probes.ts` POLLS: it fetches a component's `monitor_url` and reports
 * what it finds. That answers "is the target down?" and it is the right tool for
 * anything with a public URL.
 *
 * It cannot answer "did my monitoring stack die?" — the failure where alerting
 * silently stops while the service keeps serving, so every dashboard stays green
 * and nobody is paged. Catching that needs the opposite direction: the target
 * checks IN on a schedule and **silence is the alarm**. That is what this module
 * adds, and it is why a status page is a credible deadman target while a monitor
 * living inside the thing it watches is not.
 *
 * Wiring the classic case — Prometheus Alertmanager ships an always-firing
 * `Watchdog` alert; route it here, and if OUR page stops receiving it, the
 * component goes down:
 *
 * ```yaml
 * receivers:
 *   - name: deadman
 *     webhook_configs:
 *       - url: https://status.example.com/api/public/heartbeat/<heartbeat_key>
 * ```
 *
 * Env knobs:
 *   - `STATUS_HEARTBEAT_GRACE_MS` — slack added to each component's interval
 *     before it counts as overdue (default 30000). Absorbs scheduler jitter and
 *     one dropped beat's worth of network flake without flapping.
 *
 * @module
 */

import { randomBytes } from 'node:crypto'

import { findMany, updateById } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'

import { recordStatusTransition } from './status-transitions.js'

const DEFAULT_GRACE_MS = 30_000

/**
 * Mint a heartbeat key.
 *
 * This value appears in a PUBLIC, unauthenticated URL and is the only thing
 * standing between an attacker and the ability to beat on behalf of a dead
 * service — suppressing a real outage on the status page. So it is generated
 * here from a CSPRNG and is never accepted from a client: a caller-chosen key
 * would inevitably be a slug ("api", "alertmanager") that anyone can guess.
 *
 * 32 bytes, base64url — 256 bits, URL-safe with no escaping.
 *
 * @returns A fresh, unguessable heartbeat key.
 */
export function generateHeartbeatKey(): string {
  return randomBytes(32).toString('base64url')
}

/** Grace added to each interval before a heartbeat counts as overdue. */
export function heartbeatGraceMs(): number {
  const raw = process.env.STATUS_HEARTBEAT_GRACE_MS
  if (raw === undefined || raw === '') return DEFAULT_GRACE_MS
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_GRACE_MS
}

/**
 * Record a heartbeat for the component holding `key`.
 *
 * Returns false for an unknown key rather than throwing, so the public endpoint
 * can answer 404 without leaking whether a key exists via an error shape.
 *
 * @param key - The component's `heartbeat_key`.
 * @returns True when a component matched and its timestamp was updated.
 */
export async function recordHeartbeat(key: string): Promise<boolean> {
  const trimmed = key.trim()
  if (!trimmed) return false

  const [component] = await findMany<Record<string, unknown>>('status_components', {
    where: [{ field: 'heartbeat_key', operator: '=', value: trimmed }],
    limit: 1,
  })
  if (!component) return false

  const now = new Date().toISOString()
  await updateById('status_components', String(component.id), { last_heartbeat_at: now })

  // Beating again is the recovery signal — bring it back up immediately rather
  // than waiting for the next sweep, so a resolved outage clears at the moment
  // the evidence arrives.
  await recordStatusTransition(component, 'operational', 'heartbeat', { recoveredAt: now })
  return true
}

/**
 * One staleness sweep: mark every heartbeat-configured component whose last
 * beat is older than its interval (plus grace) as `major_outage`.
 *
 * A component that has NEVER beaten is measured from `updated_at` (falling back
 * to `created_at`), which gives a freshly-configured monitor exactly one full
 * interval to report in before it alarms — otherwise saving a new heartbeat
 * monitor would instantly page for an outage that has not happened. After that
 * grace, a never-beaten monitor DOES go down: "it never reported" is a failure,
 * not an exemption, and treating it as healthy is how a deadman quietly becomes
 * decorative.
 */
export async function runHeartbeatChecks(): Promise<void> {
  const components = await findMany<Record<string, unknown>>('status_components', {})
  const grace = heartbeatGraceMs()
  const now = Date.now()

  for (const component of components) {
    const key = typeof component.heartbeat_key === 'string' ? component.heartbeat_key.trim() : ''
    if (!key) continue

    const intervalSeconds = Number(component.heartbeat_interval_seconds)
    if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) {
      // The DB CHECK constraint forbids this pairing; if it appears anyway the
      // monitor is undefined, and an undefined monitor must be loud, not silent.
      logger.warn('heartbeats: component has a key but no usable interval', {
        componentId: component.id,
        heartbeat_interval_seconds: component.heartbeat_interval_seconds,
      })
      continue
    }

    const reference =
      component.last_heartbeat_at ?? component.updated_at ?? component.created_at ?? null
    const referenceMs = reference ? new Date(String(reference)).getTime() : NaN
    if (!Number.isFinite(referenceMs)) {
      logger.warn('heartbeats: component has no usable reference timestamp', {
        componentId: component.id,
      })
      continue
    }

    const overdue = now - referenceMs > intervalSeconds * 1000 + grace
    if (!overdue) continue

    try {
      await recordStatusTransition(component, 'major_outage', 'heartbeat', {
        lastHeartbeatAt: component.last_heartbeat_at ?? null,
        overdueBySeconds: Math.round((now - referenceMs) / 1000 - intervalSeconds),
        neverBeaten: !component.last_heartbeat_at,
      })
    } catch (error) {
      // One failed write must not starve the rest of the sweep.
      logger.warn('heartbeats: failed to record overdue transition', {
        error,
        componentId: component.id,
      })
    }
  }
}
