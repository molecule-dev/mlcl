/**
 * molecule-mcp's telemetry posture must MIRROR the CLI's — that is what its
 * own module header claims, what mcp/README.md points at ("see the mlcl
 * README's Telemetry & privacy section"), and what that section promises for
 * "`mlcl` (and `molecule-mcp`)": `DO_NOT_TRACK=1` opts out, and a local
 * MOLECULE_ENV=local run stays silent unless telemetry is explicitly
 * re-enabled. The server's telemetryEnabled() checked only MOLECULE_TELEMETRY,
 * so a user (or CI) who silenced the CLI with DO_NOT_TRACK=1 was still tracked
 * by every molecule-mcp tool call — and MLCL_DEBUG=1, promised as the way to
 * "inspect traffic yourself", logged nothing because emit failures were
 * swallowed without a log.
 *
 * @module
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { telemetryEnabled, trackToolCall } from '../../../mcp/src/telemetry.js'

const OPT_OUT_KEYS = ['MOLECULE_TELEMETRY', 'DO_NOT_TRACK', 'MOLECULE_ENV', 'MLCL_DEBUG'] as const

beforeEach(() => {
  for (const key of OPT_OUT_KEYS) delete process.env[key]
})

afterEach(() => {
  vi.restoreAllMocks()
  for (const key of OPT_OUT_KEYS) delete process.env[key]
})

describe('molecule-mcp telemetry posture mirrors the CLI', () => {
  it('honors the cross-tool DO_NOT_TRACK=1 opt-out', () => {
    process.env.DO_NOT_TRACK = '1'
    expect(telemetryEnabled()).toBe(false)
  })

  it('DO_NOT_TRACK=1 wins over MOLECULE_TELEMETRY=1 (it is an opt-out)', () => {
    process.env.DO_NOT_TRACK = '1'
    process.env.MOLECULE_TELEMETRY = '1'
    expect(telemetryEnabled()).toBe(false)
  })

  it('a local (MOLECULE_ENV=local) run never reports unless explicitly enabled', () => {
    process.env.MOLECULE_ENV = 'local'
    expect(telemetryEnabled()).toBe(false)
    process.env.MOLECULE_TELEMETRY = '1'
    expect(telemetryEnabled()).toBe(true)
  })

  it('keeps the plain opt-out and the on-by-default the docs promise', () => {
    expect(telemetryEnabled()).toBe(true)
    process.env.MOLECULE_TELEMETRY = '0'
    expect(telemetryEnabled()).toBe(false)
  })

  it('logs an emit failure under MLCL_DEBUG=1 — the promised traffic inspection', async () => {
    process.env.MLCL_DEBUG = '1'
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rejectingFetch = vi.fn().mockRejectedValue(new Error('network down'))
    const originalFetch = globalThis.fetch
    globalThis.fetch = rejectingFetch as typeof globalThis.fetch
    try {
      trackToolCall('search_packages', true, Date.now() - 5)
      await vi.waitFor(
        () => {
          expect(errorSpy).toHaveBeenCalled()
        },
        { timeout: 2_000 },
      )
      expect(errorSpy.mock.calls[0]?.[0]).toContain('[telemetry]')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  it('stays silent about emit failures without MLCL_DEBUG', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const rejectingFetch = vi.fn().mockRejectedValue(new Error('network down'))
    const originalFetch = globalThis.fetch
    globalThis.fetch = rejectingFetch as typeof globalThis.fetch
    try {
      trackToolCall('search_packages', true, Date.now() - 5)
      await new Promise((resolve) => setTimeout(resolve, 25))
      expect(errorSpy).not.toHaveBeenCalled()
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
