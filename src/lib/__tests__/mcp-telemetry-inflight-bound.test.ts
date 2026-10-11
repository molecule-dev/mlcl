/**
 * A telemetry emit is DROPPED, never queued, once the server is already
 * emitting its cap's worth.
 *
 * The hosted MCP server is public and unauthenticated, so its request budget
 * (mcp/src/http.ts) is per client ADDRESS: a flood from many addresses — a
 * botnet, a header-rotating client behind an unguarded proxy — arrives inside
 * each address's own budget. Every accepted tool call started one outbound
 * POST to the telemetry endpoint, and nothing bounded how many were in flight
 * at once: a burst of B calls held B pending requests, B abort timers and B
 * socket slots for the 5 s the emit timeout allows, growing with the incoming
 * rate rather than with the work the server owes anyone.
 *
 * The emit is best-effort by its own contract ("never throws, never blocks"),
 * so the fix bounds the in-flight emits and DROPS the overflow — a queue would
 * be the very thing the bound exists to prevent. These tests drive that bound
 * through the public `trackToolCall` entry point with a fetch double whose
 * requests stay parked, then release them and prove the slots come back (a
 * counter that never released would silence telemetry for the life of the
 * process).
 *
 * @module
 */
import { rmSync } from 'node:fs'
import type * as NodeOs from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// telemetry.ts resolves its id file from `homedir()` at module load — the same
// throwaway home the sibling telemetry suites run against, so these tests
// neither read nor mint the real user's telemetry id.
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof NodeOs>('node:os')
  return { ...actual, homedir: () => join(actual.tmpdir(), 'mlcl-mcp-telemetry-inflight-home') }
})

import { MAX_IN_FLIGHT_EMITS, trackToolCall } from '../../../mcp/src/telemetry.js'

const HOME = join(tmpdir(), 'mlcl-mcp-telemetry-inflight-home')
const ORIGINAL_FETCH = globalThis.fetch

beforeEach(() => {
  rmSync(HOME, { recursive: true, force: true })
  delete process.env.DO_NOT_TRACK
  delete process.env.MOLECULE_ENV
  delete process.env.MOLECULE_TELEMETRY
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  rmSync(HOME, { recursive: true, force: true })
})

/**
 * A `fetch` double whose requests STAY in flight until the test settles them —
 * an emit that never settles is the state the bound is about, and a double that
 * resolved immediately would release every slot before the next call and hide
 * it (the uncapped code and the capped one behave identically there).
 *
 * @returns The spy, and a function that settles every request it has seen and
 *   then yields long enough for the emit bookkeeping to run.
 */
function parkedFetch(): { spy: ReturnType<typeof vi.fn>; settleAll: () => Promise<void> } {
  const resolvers: Array<() => void> = []
  const spy = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolvers.push(() => resolve({ ok: true } as Response))
      }),
  )
  return {
    spy,
    settleAll: async () => {
      for (const resolve of resolvers.splice(0)) resolve()
      // A macrotask: the emit's `.finally` (which releases the slot) runs in a
      // microtask chain, so the counter is back to zero by the time this
      // resolves.
      await new Promise((resolve) => setTimeout(resolve))
    },
  }
}

describe('molecule-mcp telemetry emits are bounded in flight', () => {
  it('caps the outbound requests under a burst instead of starting one per tool call', async () => {
    const { spy, settleAll } = parkedFetch()
    globalThis.fetch = spy as unknown as typeof globalThis.fetch

    const burst = MAX_IN_FLIGHT_EMITS * 10
    for (let i = 0; i < burst; i++) trackToolCall('search_packages', true, Date.now())

    // Without the bound this is `burst` — one pending request (and one abort
    // timer, and one socket slot) per accepted tool call.
    expect(
      spy,
      `${burst} tool calls must not hold ${burst} outbound emits in flight`,
    ).toHaveBeenCalledTimes(MAX_IN_FLIGHT_EMITS)

    await settleAll()
  })

  it('releases a slot when an emit settles, so a later call still emits', async () => {
    const { spy, settleAll } = parkedFetch()
    globalThis.fetch = spy as unknown as typeof globalThis.fetch

    for (let i = 0; i < MAX_IN_FLIGHT_EMITS; i++) {
      trackToolCall('search_packages', true, Date.now())
    }
    expect(spy).toHaveBeenCalledTimes(MAX_IN_FLIGHT_EMITS)

    // The parked emits settle (a real one would resolve, or be aborted by the
    // 5 s timeout): the slots must come back, or telemetry would go silent for
    // the life of the process the first time the endpoint was slow.
    await settleAll()
    trackToolCall('search_packages', true, Date.now())
    expect(spy, 'a settled emit must release its slot').toHaveBeenCalledTimes(
      MAX_IN_FLIGHT_EMITS + 1,
    )

    await settleAll()
  })

  it('a failed emit releases its slot too — the bound is not a one-way latch', async () => {
    // The realistic saturation: the endpoint is unreachable and every emit
    // rejects. A release wired to the success path only would latch the cap on
    // after the first failure.
    let calls = 0
    const spy = vi.fn(() => {
      calls++
      return Promise.reject(new Error('network down'))
    })
    globalThis.fetch = spy as unknown as typeof globalThis.fetch

    for (let i = 0; i < MAX_IN_FLIGHT_EMITS * 2; i++) {
      trackToolCall('search_packages', false, Date.now())
      // Let the rejection (and the release) run between calls, so each one sees
      // a free slot — the count therefore tracks the calls, not the cap.
      await new Promise((resolve) => setTimeout(resolve))
    }

    expect(calls).toBe(MAX_IN_FLIGHT_EMITS * 2)
  })
})
