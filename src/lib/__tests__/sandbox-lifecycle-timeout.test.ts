/**
 * The sandbox lifecycle transport. A `start`/`restart` POST does not answer
 * until the platform has booted the sandbox — on production that routinely
 * outlives the generic 30 s request budget (P7, 2026-10-21: `mlcl sandbox
 * start` reported `TimeoutError` about 30 s in while the same preserved
 * project later reached `running`). These tests drive the REAL request path
 * against a local HTTP server whose response is delayed past that budget.
 *
 * The deadline timers are the only thing faked: `AbortSignal.timeout` is
 * replaced with an equivalent signal driven by the fake clock, so a test can
 * advance past 30 s and 10 min instantly while fetch, the HTTP server and the
 * response parsing stay real. The milliseconds the transport actually asked
 * for are recorded, so the assertion is about the shipped deadline, not a
 * re-statement of it.
 */
import { createServer, type Server } from 'node:http'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getSandboxStatus,
  PlatformApiError,
  SANDBOX_LIFECYCLE_TIMEOUT_MS,
  sandboxAction,
} from '../platform.js'

/** How long the mock platform takes to answer a lifecycle request. */
let delayMs: number
/** The answer the mock platform sends (or `hang` to never answer). */
let reply: { status: number; headers?: Record<string, string>; body: string } | 'hang'
/** Every deadline the transport asked for, in call order. */
let requestedTimeouts: number[]
/** Callbacks waiting for the server to receive a request (so a test can start its clock after it landed). */
let requestWaiters: Array<() => void>
let server: Server

/** Resolves once the mock platform receives the NEXT request. */
function nextRequest(): Promise<void> {
  return new Promise<void>((resolve) => requestWaiters.push(resolve))
}

/**
 * Replace `AbortSignal.timeout` with the same contract on the FAKE clock:
 * abort with a `TimeoutError` after `ms`. The real implementation schedules on
 * an internal timer the fake clock cannot reach, which is why the deadline is
 * injected instead of waited on.
 */
function deadlineOnFakeClock(): void {
  vi.spyOn(AbortSignal, 'timeout').mockImplementation((ms?: number) => {
    const delay = ms ?? 0
    requestedTimeouts.push(delay)
    const controller = new AbortController()
    setTimeout(
      () =>
        controller.abort(
          new DOMException('The operation was aborted due to timeout', 'TimeoutError'),
        ),
      delay,
    )
    return controller.signal
  })
}

/**
 * Track a promise without awaiting it, so a test can assert a request is still
 * pending at a given clock value. The rejection handler is attached at once,
 * so a later advance cannot surface as an unhandled rejection.
 */
function track<T>(promise: Promise<T>): {
  status: 'pending' | 'fulfilled' | 'rejected'
  value?: T
  error?: unknown
} {
  const state: { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; error?: unknown } = {
    status: 'pending',
  }
  promise.then(
    (value) => {
      state.status = 'fulfilled'
      state.value = value
    },
    (error: unknown) => {
      state.status = 'rejected'
      state.error = error
    },
  )
  return state
}

beforeEach(async () => {
  delayMs = 0
  reply = {
    status: 200,
    body: JSON.stringify({ status: 'running', previewUrl: 'https://p1.mlcl.dev' }),
  }
  requestedTimeouts = []
  requestWaiters = []
  server = createServer((_req, res) => {
    for (const waiter of requestWaiters.splice(0)) waiter()
    setTimeout(() => {
      if (reply === 'hang') return
      res.writeHead(reply.status, { 'content-type': 'application/json', ...reply.headers })
      res.end(reply.body)
    }, delayMs)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  process.env.MOLECULE_API_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`
  process.env.MOLECULE_TOKEN = 'tok_test'
})

afterEach(async () => {
  vi.useRealTimers()
  delete process.env.MOLECULE_API_URL
  delete process.env.MOLECULE_TOKEN
  vi.restoreAllMocks()
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('sandbox lifecycle deadline', () => {
  it('gives start and restart the bounded lifecycle budget, not the 30 s default', () => {
    expect(SANDBOX_LIFECYCLE_TIMEOUT_MS).toBe(10 * 60_000)
    expect(SANDBOX_LIFECYCLE_TIMEOUT_MS).toBeGreaterThan(5 * 60_000) // the server's own start deadline
  })

  it('start waits out a cold boot that outlives the 30 s default', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    deadlineOnFakeClock()
    delayMs = 45_000

    const received = nextRequest()
    const result = track(sandboxAction('p1', 'start'))
    await received

    // The old budget aborted at 30 s; the boot is still running then.
    await vi.advanceTimersByTimeAsync(30_001)
    expect(result.status).toBe('pending')

    // The delayed but valid answer lands and is parsed by the real transport.
    await vi.advanceTimersByTimeAsync(15_000)
    expect(result.status).toBe('fulfilled')
    expect(result.value).toMatchObject({ status: 'running', previewUrl: 'https://p1.mlcl.dev' })
    expect(requestedTimeouts).toEqual([SANDBOX_LIFECYCLE_TIMEOUT_MS])
  })

  it('restart waits out a cold boot that outlives the 30 s default', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    deadlineOnFakeClock()
    delayMs = 45_000

    const received = nextRequest()
    const result = track(sandboxAction('p1', 'restart'))
    await received

    await vi.advanceTimersByTimeAsync(30_001)
    expect(result.status).toBe('pending')
    await vi.advanceTimersByTimeAsync(15_000)
    expect(result.status).toBe('fulfilled')
    expect(requestedTimeouts).toEqual([SANDBOX_LIFECYCLE_TIMEOUT_MS])
  })

  it('keeps the short default for stop and status reads', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    deadlineOnFakeClock()
    delayMs = 5_000

    const stopReceived = nextRequest()
    const stop = track(sandboxAction('p1', 'stop'))
    await stopReceived
    await vi.advanceTimersByTimeAsync(5_000)
    expect(stop.status).toBe('fulfilled')

    const statusReceived = nextRequest()
    const status = track(getSandboxStatus('p1'))
    await statusReceived
    await vi.advanceTimersByTimeAsync(5_000)
    expect(status.status).toBe('fulfilled')
    expect(status.value).toMatchObject({ status: 'running' })
    expect(requestedTimeouts).toEqual([30_000, 30_000])
  })

  it('still fails a start that genuinely outlives the lifecycle budget', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    deadlineOnFakeClock()
    reply = 'hang'

    const received = nextRequest()
    const result = track(sandboxAction('p1', 'start'))
    await received

    // Not at the old 30 s mark — that is the bug this fix removes.
    await vi.advanceTimersByTimeAsync(30_001)
    expect(result.status).toBe('pending')

    // The bounded lifecycle deadline is real: one millisecond past it aborts.
    await vi.advanceTimersByTimeAsync(SANDBOX_LIFECYCLE_TIMEOUT_MS - 30_001 - 1)
    expect(result.status).toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    expect(result.status).toBe('rejected')
    expect((result.error as Error).name).toBe('TimeoutError')
    expect(requestedTimeouts).toEqual([SANDBOX_LIFECYCLE_TIMEOUT_MS])
  })

  it('retains a real server error on start (it is not reported as a timeout)', async () => {
    reply = {
      status: 503,
      body: JSON.stringify({ error: 'Service busy.', errorKey: 'service.busy' }),
    }
    const error = await sandboxAction('p1', 'start').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PlatformApiError)
    expect((error as PlatformApiError).status).toBe(503)
    expect((error as PlatformApiError).errorKey).toBe('service.busy')
    expect((error as Error).name).not.toBe('TimeoutError')
  })

  it('retains the unreachable-platform error on start', async () => {
    const port = (server.address() as { port: number }).port
    await new Promise<void>((resolve) => server.close(() => resolve()))
    server.closeAllConnections()
    process.env.MOLECULE_API_URL = `http://127.0.0.1:${port}`
    const error = await sandboxAction('p1', 'start').catch((e: unknown) => e)
    expect((error as Error).message).toMatch(/Cannot reach http:\/\/127\.0\.0\.1:\d+/)
  })
})
