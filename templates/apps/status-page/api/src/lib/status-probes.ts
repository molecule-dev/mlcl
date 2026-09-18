/**
 * Recurring monitor probes for status-page components.
 *
 * Components carry an optional `monitor_url`; this module is what actually
 * MAKES the status page a monitor: a recurring task (registered through the
 * bonded `@molecule/api-scheduler` provider at boot — see `setupBonds()`)
 * probes every component's `monitor_url` and, when a component flips between
 * up and down, records the change exactly the way the manual
 * `PUT /components/:id/status` handler does — `status_components.status`
 * plus a `component_status_history` row (plus an audit entry).
 *
 * Up/down maps onto the app's existing status vocabulary:
 *   - reachable, HTTP < 400  → `operational`
 *   - HTTP >= 400 / network error / timeout / SSRF-blocked → `major_outage`
 * Components whose current status is `under_maintenance` are left alone —
 * an operator-declared maintenance window must not be flipped by a probe.
 * Statuses in between (`degraded_performance`, `partial_outage`) stay
 * operator-set: a probe only ever asserts fully-up or fully-down, so it
 * REPLACES a manual "degraded" once the target actually goes down or is
 * verifiably serving again.
 *
 * Probes use `safeFetch` (see `./safe-fetch.js`): `monitor_url` is
 * user-supplied, so connections are pinned away from private/internal/
 * metadata addresses. To monitor an internal target on purpose (local dev,
 * E2E), allow-list it via `SAFE_FETCH_ALLOW_HOSTS=host:port[,host]`.
 *
 * Env knobs:
 *   - `STATUS_PROBE_INTERVAL_MS` — probe interval (default 60000). `0`
 *     disables the recurring task entirely. Sub-second values are meant for
 *     tests/E2E only.
 *   - `STATUS_PROBE_TIMEOUT_MS` — per-request timeout (default 10000).
 */

import { findMany } from '@molecule/api-database'
import { logger } from '@molecule/api-logger'
import { getProvider, hasProvider, schedule, unschedule } from '@molecule/api-scheduler'

import { runHeartbeatChecks } from './heartbeats.js'
import { safeFetch } from './safe-fetch.js'
import { recordStatusTransition } from './status-transitions.js'

/** Name of the recurring probe task in the bonded scheduler. */
export const STATUS_PROBE_TASK = 'status-page:monitor-probes'

const DEFAULT_INTERVAL_MS = 60_000
const DEFAULT_TIMEOUT_MS = 10_000

/**
 * Probe interval in ms — `STATUS_PROBE_INTERVAL_MS`, defaulting to 60s.
 * Returns 0 when probing is explicitly disabled (`STATUS_PROBE_INTERVAL_MS=0`).
 */
export function probeIntervalMs(): number {
  const raw = process.env.STATUS_PROBE_INTERVAL_MS
  if (raw === undefined || raw === '') return DEFAULT_INTERVAL_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_INTERVAL_MS
  return parsed
}

/** Per-probe request timeout in ms — `STATUS_PROBE_TIMEOUT_MS`, default 10s. */
export function probeTimeoutMs(): number {
  const parsed = Number(process.env.STATUS_PROBE_TIMEOUT_MS ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

/** Outcome of probing one monitor URL. */
export interface ProbeResult {
  /** True when the target responded with HTTP < 400. */
  up: boolean
  /** The HTTP status received, or null when the request never completed. */
  httpStatus: number | null
  /** Failure detail (HTTP status line, network/timeout/SSRF error), or null when up. */
  error: string | null
}

/**
 * Probe a single monitor URL. Never throws — every failure mode (network
 * error, timeout, SSRF block, HTTP error status) collapses to `up: false`
 * with the reason captured.
 *
 * @param url - The component's `monitor_url`.
 * @param timeoutMs - Request timeout (defaults to `probeTimeoutMs()`).
 * @returns The probe outcome.
 */
export async function probeMonitorUrl(
  url: string,
  timeoutMs = probeTimeoutMs(),
): Promise<ProbeResult> {
  try {
    const response = await safeFetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const up = response.status < 400
    return { up, httpStatus: response.status, error: up ? null : `http ${response.status}` }
  } catch (error) {
    return {
      up: false,
      httpStatus: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * One probe sweep: check every component that has a `monitor_url` and record
 * status transitions (component row + `component_status_history` + audit),
 * mirroring the manual status-change handler's writes. Components under
 * maintenance are skipped. Per-component failures are logged and never abort
 * the rest of the sweep.
 */
export async function runComponentProbes(): Promise<void> {
  const components = await findMany<Record<string, unknown>>('status_components', {})
  for (const component of components) {
    const url = typeof component.monitor_url === 'string' ? component.monitor_url.trim() : ''
    if (!url) continue
    if (component.status === 'under_maintenance') continue
    // A heartbeat is a stronger signal than a poll: it is reported BY the target
    // rather than inferred from outside, so when a component has both, the
    // heartbeat sweep owns its status and polling it too would fight over the row.
    if (typeof component.heartbeat_key === 'string' && component.heartbeat_key.trim()) continue

    try {
      const result = await probeMonitorUrl(url)
      const nextStatus = result.up ? 'operational' : 'major_outage'
      await recordStatusTransition(component, nextStatus, 'monitor-probe', {
        httpStatus: result.httpStatus,
        error: result.error,
      })
    } catch (error) {
      // One broken component (e.g. a transient DB write failure) must not
      // starve the rest of the sweep — log and move on; the next tick retries.
      logger.warn('status-probes: failed to record probe result', {
        error,
        componentId: component.id,
      })
    }
  }
}

/**
 * One full monitor sweep: poll every `monitor_url`, then check every heartbeat
 * for staleness.
 *
 * The two run in sequence under a single scheduled task so a component can never
 * be evaluated by both halves in the same tick. Each half already isolates its
 * own per-component failures, but they are also isolated from EACH OTHER here:
 * a poller that throws must not skip the heartbeat sweep, because the heartbeat
 * sweep is the half that detects "monitoring itself is dead" — precisely the
 * condition under which other things are also failing.
 */
export async function runMonitorSweep(): Promise<void> {
  try {
    await runComponentProbes()
  } catch (error) {
    logger.warn('status-probes: URL probe sweep failed', { error })
  }
  try {
    await runHeartbeatChecks()
  } catch (error) {
    logger.warn('status-probes: heartbeat sweep failed', { error })
  }
}

/**
 * Register the recurring probe task with the bonded scheduler and start it.
 * Called at the end of `setupBonds()` (after the database + scheduler bonds
 * are wired). Idempotent: re-scheduling under the same name replaces the
 * task, and the default scheduler's `start()` is a no-op when already
 * started. Honors `STATUS_PROBE_INTERVAL_MS=0` as "probing disabled".
 */
export function startStatusProbes(): void {
  const intervalMs = probeIntervalMs()
  if (intervalMs === 0) {
    logger.info('status-probes: disabled via STATUS_PROBE_INTERVAL_MS=0')
    return
  }
  schedule({
    name: STATUS_PROBE_TASK,
    intervalMs,
    handler: runMonitorSweep,
  })
  getProvider().start()
}

/** Remove the recurring probe task (test teardown / graceful shutdown). */
export function stopStatusProbes(): void {
  if (!hasProvider()) return
  unschedule(STATUS_PROBE_TASK)
}
