/**
 * molecule-mcp's anonymous install id is the ONLY cross-event identifier its
 * telemetry carries (`event.anonymousId`, a uuid in ~/.mlcl/telemetry-id).
 *
 * `installId()` returned whatever the file held as soon as the file EXISTED —
 * and `writeFileSync` opens with O_TRUNC before it writes, so a crash or a full
 * disk between the truncating open and the write leaves a ZERO-LENGTH file. The
 * early return then read that `''` back on every later run: a blank
 * `anonymousId` on every event, for the life of the install, with the file
 * never repaired and nothing logged. The read must treat an empty file as "no
 * id yet" and mint one.
 *
 * @module
 */
import type * as NodeFs from 'node:fs'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import type * as NodeOs from 'node:os'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Lets one test hide the id file from `existsSync` while it exists on disk —
 * the interleaving a second process's first call produces, made deterministic.
 */
const race = vi.hoisted(() => ({ hideIdFile: false }))

// `mcp/src/telemetry.ts` resolves its id file from `homedir()` at module load,
// so the whole test runs against a throwaway home. Everything else on node:os
// is the real module.
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof NodeOs>('node:os')
  return { ...actual, homedir: () => join(actual.tmpdir(), 'mlcl-mcp-telemetry-id-home') }
})

// The same home, seen through node:fs: `existsSync` reports the file as absent
// on demand (the stat that happened BEFORE another writer published), while
// every real read/write still touches it.
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof NodeFs>('node:fs')
  return {
    ...actual,
    // Matched by suffix: the factory is hoisted above the imports, so the
    // throwaway home's absolute path (which needs `os.tmpdir()`) is not
    // available here. The id file is the only path this suite names that ends
    // this way.
    existsSync: (path: unknown) =>
      race.hideIdFile && String(path).endsWith('.mlcl/telemetry-id')
        ? false
        : actual.existsSync(path as never),
  }
})

import { trackToolCall } from '../../../mcp/src/telemetry.js'

const HOME = join(tmpdir(), 'mlcl-mcp-telemetry-id-home')
const ID_FILE = join(HOME, '.mlcl', 'telemetry-id')
const ORIGINAL_FETCH = globalThis.fetch

/** The telemetry POST body of the first captured fetch call. */
function payloadOf(fetchMock: ReturnType<typeof vi.fn>): {
  event: { anonymousId: string }
} {
  const call = fetchMock.mock.calls[0]
  if (!call) throw new Error('telemetry made no request')
  return JSON.parse((call[1] as { body: string }).body) as { event: { anonymousId: string } }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  rmSync(HOME, { recursive: true, force: true })
  mkdirSync(join(HOME, '.mlcl'), { recursive: true })
  delete process.env.DO_NOT_TRACK
  delete process.env.MOLECULE_ENV
  delete process.env.MOLECULE_TELEMETRY
  fetchMock = vi.fn().mockResolvedValue({ ok: true })
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  rmSync(HOME, { recursive: true, force: true })
})

describe('molecule-mcp install id', () => {
  it('mints and persists an id when the id file does not exist yet', () => {
    expect(existsSync(ID_FILE)).toBe(false)

    trackToolCall('search_packages', true, Date.now())

    // A fresh install: the path the empty-file case must fall back to.
    const first = payloadOf(fetchMock).event.anonymousId
    expect(first).toMatch(/^[0-9a-f-]{36}$/)
    expect(readFileSync(ID_FILE, 'utf8')).toBe(first)
  })

  it('reuses an existing id — the identity is stable across runs', () => {
    writeFileSync(ID_FILE, '11111111-2222-4333-8444-555555555555\n')

    trackToolCall('search_packages', true, Date.now())

    expect(payloadOf(fetchMock).event.anonymousId).toBe('11111111-2222-4333-8444-555555555555')
    // …and the file is left exactly as it was.
    expect(readFileSync(ID_FILE, 'utf8')).toBe('11111111-2222-4333-8444-555555555555\n')
  })

  it('adopts the id another writer published instead of overwriting it', () => {
    // Two processes sharing one ~/.mlcl can both pass the "does the id file
    // exist?" read (the stat happened before the other's write) and then both
    // write. A plain create published whichever id landed LAST, while the loser
    // had already put its OWN id on the event it was sending — one install
    // split across two anonymousIds. Exclusive creation makes the loser fail and
    // read the winner's id instead.
    const winner = '99999999-8888-4777-8666-555555555555'
    writeFileSync(ID_FILE, winner)
    race.hideIdFile = true
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.hideIdFile = false
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(winner)
    // The winner's id survives: the loser must not clobber the shared file.
    expect(readFileSync(ID_FILE, 'utf8')).toBe(winner)
  })

  it('replaces a ZERO-LENGTH id file instead of reporting a blank id forever', () => {
    // The state a write that failed between the truncating open and the data
    // leaves behind. Returning '' here would make every event of this install
    // anonymousId: '' — permanently, since the empty file is never rewritten.
    writeFileSync(ID_FILE, '')

    trackToolCall('search_packages', true, Date.now())

    const id = payloadOf(fetchMock).event.anonymousId
    expect(id).not.toBe('')
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    // The repair is persisted, not re-minted on every call.
    expect(readFileSync(ID_FILE, 'utf8')).toBe(id)
  })
})
