/**
 * `tracked()` is the wrapper EVERY molecule-mcp tool registration routes
 * through (remote.ts's three tools, server.ts's stdio set) — its whole job is
 * the ok flag: a tool that RESOLVED emits `ok: true`, a tool that THREW emits
 * `ok: false` AND rethrows, so the client sees the failure while the telemetry
 * records it. A handler that RESOLVES carrying `isError: true` — how every
 * hosted-service failure is reported (see `serviceResult`) — is a failed tool
 * call too, and counts as one. No other test drives it: the sibling suites
 * exercise `trackToolCall` directly, so a wrapper that reported every failure as
 * success — or swallowed the error a client needed to see — stayed green.
 *
 * @module
 */
import { rmSync } from 'node:fs'
import type * as NodeOs from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// telemetry.ts resolves its id file from `homedir()` at module load — the same
// throwaway home the install-id and posture suites run against, so these tests
// neither read nor mint the real user's telemetry id.
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof NodeOs>('node:os')
  return { ...actual, homedir: () => join(actual.tmpdir(), 'mlcl-mcp-tracked-home') }
})

import { tracked } from '../../../mcp/src/telemetry.js'

const HOME = join(tmpdir(), 'mlcl-mcp-tracked-home')
const ORIGINAL_FETCH = globalThis.fetch

/** The telemetry POST body of the first captured fetch call. */
function payloadOf(fetchMock: ReturnType<typeof vi.fn>): {
  event: { name: string; properties: { tool: string; ok: boolean; durationMs: number } }
} {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('the wrapper made no telemetry request')
  return JSON.parse((call[1] as { body: string }).body) as never
}

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

describe('tracked — the wrapper every tool call is routed through', () => {
  it('emits ok:true and returns the handler’s result when the tool resolves', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const wrapped = tracked('search_packages', async () => 42)
    await expect(wrapped({} as never)).resolves.toBe(42)

    const payload = payloadOf(fetchMock)
    expect(payload.event.name).toBe('mcp.tool_call')
    expect(payload.event.properties.tool).toBe('search_packages')
    expect(payload.event.properties.ok).toBe(true)
    expect(Number.isFinite(payload.event.properties.durationMs)).toBe(true)
  })

  it('emits ok:false and STILL rethrows when the tool throws', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const wrapped = tracked('read_package_doc', async () => {
      throw new Error('registry unreachable')
    })
    // The client must still see the failure — a wrapper that swallowed it
    // turned every broken tool into a silent non-answer.
    await expect(wrapped({} as never)).rejects.toThrow('registry unreachable')

    // …and the telemetry must record it as a failure, not a success.
    expect(payloadOf(fetchMock).event.properties.ok).toBe(false)
  })

  it('emits ok:false for a handler that RESOLVES with the isError shape', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    // How every hosted-service failure reaches the client: the handler RESOLVES
    // (so the agent reads a sentence, not a protocol error) carrying isError.
    // A wrapper that only watched for a throw recorded each of these as a
    // success — a success rate that counted exactly the failures it exists to
    // make visible.
    const wrapped = tracked('render_pdf', async () => ({
      content: [{ type: 'text' as const, text: 'render_pdf failed (401): key rejected.' }],
      isError: true,
    }))
    const result = await wrapped({} as never)

    // The client's failure must survive the wrapper untouched…
    expect(result.isError).toBe(true)
    // …and the telemetry must record it as the failure the client saw.
    expect(payloadOf(fetchMock).event.properties.ok, 'an isError result is a failed call').toBe(
      false,
    )
  })

  it('emits ok:true for a successful result that carries content', async () => {
    // The other side of the same check: `!isErrorResult(...)` must not turn an
    // ordinary tool answer (the SDK result shape every tool returns) into a
    // failure.
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const wrapped = tracked('search_packages', async () => ({
      content: [{ type: 'text' as const, text: '[]' }],
    }))
    await wrapped({} as never)

    expect(payloadOf(fetchMock).event.properties.ok).toBe(true)
  })

  it('emits nothing when telemetry is opted out (the wrapper adds no calls of its own)', async () => {
    process.env.DO_NOT_TRACK = '1'
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch

    const wrapped = tracked('search_packages', async () => 'ok')
    await expect(wrapped({} as never)).resolves.toBe('ok')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
