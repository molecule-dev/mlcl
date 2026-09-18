/**
 * Monitor-probe tests: the status page actually MONITORS.
 *
 * Two layers are proven here, both against the REAL scheduling stack:
 *
 *  1. `runComponentProbes()` sweep semantics — up/down mapping onto the
 *     app's status vocabulary, `component_status_history` writes on every
 *     transition (mirroring the manual status-change handler), maintenance
 *     windows respected, per-component failure isolation.
 *  2. RECURRENCE — `startStatusProbes()` registered through the real
 *     `@molecule/api-scheduler` bond running the real in-memory
 *     `@molecule/api-scheduler-default` provider fires the sweep repeatedly
 *     on its own (no manual trigger anywhere), and `stopStatusProbes()`
 *     stops it.
 *
 * Only the data layer and the outbound `safeFetch` are mocked.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setProvider } from '@molecule/api-scheduler'
import { createProvider } from '@molecule/api-scheduler-default'

import {
  probeIntervalMs,
  probeMonitorUrl,
  runComponentProbes,
  startStatusProbes,
  STATUS_PROBE_TASK,
  stopStatusProbes,
} from '../lib/status-probes.js'

// Mutable in-memory data layer, shared with the mocks below via vi.hoisted.
const harness = vi.hoisted(() => {
  const state: {
    components: Array<Record<string, unknown>>
    history: Array<Record<string, unknown>>
    audit: Array<Record<string, unknown>>
    failUpdateIds: string[]
  } = { components: [], history: [], audit: [], failUpdateIds: [] }
  return { state }
})

vi.mock('@molecule/api-database', () => ({
  findMany: vi.fn(async (table: string) =>
    table === 'status_components' ? harness.state.components : [],
  ),
  updateById: vi.fn(async (table: string, id: string, data: Record<string, unknown>) => {
    if (harness.state.failUpdateIds.includes(id)) throw new Error('db write refused (test)')
    if (table === 'status_components') {
      const row = harness.state.components.find((c) => c.id === id)
      if (row) Object.assign(row, data)
      return { data: row }
    }
    return { data: null }
  }),
  create: vi.fn(async (table: string, data: Record<string, unknown>) => {
    if (table === 'component_status_history') harness.state.history.push(data)
    if (table === 'audit_log') harness.state.audit.push(data)
    return { data: { id: `${table}-${Math.random()}`, ...data } }
  }),
}))

const safeFetchMock = vi.hoisted(() => vi.fn())
vi.mock('../lib/safe-fetch.js', () => ({ safeFetch: safeFetchMock }))

/** A scheduler provider with zero stagger so recurrence tests run fast. */
function bondFreshScheduler(): ReturnType<typeof createProvider> {
  const provider = createProvider({ staggerMs: 0 })
  setProvider(provider)
  return provider
}

function seedComponent(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  const component = {
    id: `comp-${harness.state.components.length + 1}`,
    user_id: 'user-1',
    name: 'API',
    status: 'operational',
    monitor_url: 'https://example.com/health',
    ...overrides,
  }
  harness.state.components.push(component)
  return component
}

let scheduler: ReturnType<typeof createProvider>

beforeEach(() => {
  harness.state.components = []
  harness.state.history = []
  harness.state.audit = []
  harness.state.failUpdateIds = []
  safeFetchMock.mockReset()
  scheduler = bondFreshScheduler()
  delete process.env.STATUS_PROBE_INTERVAL_MS
})

afterEach(() => {
  stopStatusProbes()
  scheduler.stop()
  delete process.env.STATUS_PROBE_INTERVAL_MS
})

describe('probeMonitorUrl', () => {
  it('maps HTTP < 400 to up and >= 400 to down, and never throws on network errors', async () => {
    safeFetchMock.mockResolvedValueOnce(new Response('ok', { status: 200 }))
    expect(await probeMonitorUrl('https://example.com/health')).toEqual({
      up: true,
      httpStatus: 200,
      error: null,
    })

    safeFetchMock.mockResolvedValueOnce(new Response('boom', { status: 503 }))
    expect((await probeMonitorUrl('https://example.com/health')).up).toBe(false)

    safeFetchMock.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'))
    const down = await probeMonitorUrl('https://example.com/health')
    expect(down.up).toBe(false)
    expect(down.error).toMatch(/ENOTFOUND/)
  })
})

describe('runComponentProbes — sweep semantics', () => {
  it('flips a failing component to major_outage and records history + audit (the manual handler’s writes)', async () => {
    const component = seedComponent()
    safeFetchMock.mockResolvedValue(new Response('down', { status: 500 }))

    await runComponentProbes()

    expect(component.status).toBe('major_outage')
    expect(harness.state.history).toHaveLength(1)
    expect(harness.state.history[0]).toMatchObject({
      component_id: component.id,
      status: 'major_outage',
    })
    expect(harness.state.audit).toHaveLength(1)
    expect(String(harness.state.audit[0]?.action)).toBe('component.statusChange')
  })

  it('recovers a down component to operational when the target serves again', async () => {
    const component = seedComponent({ status: 'major_outage' })
    safeFetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await runComponentProbes()

    expect(component.status).toBe('operational')
    expect(harness.state.history[0]).toMatchObject({ status: 'operational' })
  })

  it('writes NO history when the status is unchanged (up stays operational)', async () => {
    seedComponent()
    safeFetchMock.mockResolvedValue(new Response('ok', { status: 200 }))

    await runComponentProbes()

    expect(harness.state.history).toHaveLength(0)
    expect(harness.state.audit).toHaveLength(0)
  })

  it('skips components without a monitor_url and components under maintenance', async () => {
    seedComponent({ monitor_url: '' })
    seedComponent({ monitor_url: null })
    const maintained = seedComponent({ status: 'under_maintenance' })

    await runComponentProbes()

    expect(safeFetchMock).not.toHaveBeenCalled()
    expect(maintained.status).toBe('under_maintenance')
    expect(harness.state.history).toHaveLength(0)
  })

  it('a network error counts as down', async () => {
    const component = seedComponent()
    safeFetchMock.mockRejectedValue(new Error('connect ETIMEDOUT'))

    await runComponentProbes()

    expect(component.status).toBe('major_outage')
  })

  it('one component’s write failure does not starve the rest of the sweep', async () => {
    const first = seedComponent({ id: 'comp-a' })
    const second = seedComponent({ id: 'comp-b', name: 'Web' })
    safeFetchMock.mockResolvedValue(new Response('down', { status: 500 }))
    // comp-a's status write blows up; comp-b's must still land.
    harness.state.failUpdateIds = ['comp-a']

    await expect(runComponentProbes()).resolves.toBeUndefined()

    expect(first.status).toBe('operational') // write failed, unchanged
    expect(second.status).toBe('major_outage')
    expect(harness.state.history).toHaveLength(1)
    expect(harness.state.history[0]).toMatchObject({ component_id: 'comp-b' })
  })
})

describe('startStatusProbes — recurrence through the real memory scheduler', () => {
  it('the registered task fires repeatedly ON ITS OWN and stopStatusProbes() halts it', async () => {
    seedComponent()
    safeFetchMock.mockResolvedValue(new Response('ok', { status: 200 }))
    process.env.STATUS_PROBE_INTERVAL_MS = '20'

    startStatusProbes()

    // ≥3 sweeps (each sweep probes the one component once) with NO manual
    // trigger anywhere — genuine recurrence, not a one-shot.
    await vi.waitFor(() => expect(safeFetchMock.mock.calls.length).toBeGreaterThanOrEqual(3), {
      timeout: 5_000,
      interval: 10,
    })
    const status = scheduler.getStatus(STATUS_PROBE_TASK)
    expect(status).not.toBeNull()
    expect(status!.totalRuns).toBeGreaterThanOrEqual(2)

    stopStatusProbes()
    const settled = safeFetchMock.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 120)) // > several intervals
    expect(safeFetchMock.mock.calls.length).toBe(settled)
    expect(scheduler.getStatus(STATUS_PROBE_TASK)).toBeNull()
  })

  it('a probe transition performed BY THE SCHEDULER lands in history (end-to-end tick)', async () => {
    const component = seedComponent()
    safeFetchMock.mockResolvedValue(new Response('down', { status: 500 }))
    process.env.STATUS_PROBE_INTERVAL_MS = '20'

    startStatusProbes()

    await vi.waitFor(() => expect(harness.state.history.length).toBeGreaterThanOrEqual(1), {
      timeout: 5_000,
      interval: 10,
    })
    expect(component.status).toBe('major_outage')
  })

  it('re-registering is idempotent (same task name replaces, never duplicates)', async () => {
    seedComponent()
    safeFetchMock.mockResolvedValue(new Response('ok', { status: 200 }))
    process.env.STATUS_PROBE_INTERVAL_MS = '50'

    startStatusProbes()
    startStatusProbes()

    expect(scheduler.getAllStatuses().filter((s) => s.name === STATUS_PROBE_TASK)).toHaveLength(1)
  })

  it('STATUS_PROBE_INTERVAL_MS=0 disables probing entirely', () => {
    process.env.STATUS_PROBE_INTERVAL_MS = '0'
    expect(probeIntervalMs()).toBe(0)

    startStatusProbes()

    expect(scheduler.getStatus(STATUS_PROBE_TASK)).toBeNull()
  })

  it('falls back to the 60s default on unset/garbage intervals', () => {
    expect(probeIntervalMs()).toBe(60_000)
    process.env.STATUS_PROBE_INTERVAL_MS = 'soon'
    expect(probeIntervalMs()).toBe(60_000)
    process.env.STATUS_PROBE_INTERVAL_MS = '-5'
    expect(probeIntervalMs()).toBe(60_000)
  })
})
