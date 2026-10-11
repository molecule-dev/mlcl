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
 * the interleaving a second process's first call produces, made deterministic —
 * and another report it as EMPTY for the first reads while the real bytes are
 * already there (a winner observed mid-write). Two more hooks drive the
 * empty-leftover takeover's races: `takeoverLosesTo` makes the takeover's
 * exclusive create fail with EEXIST while a rival's bytes land instead (a rival
 * that wins the freed name in the rename→create gap), and `leftoverHolds` makes
 * the renamed-aside file read back non-empty (a live writer whose bytes landed
 * between the adopt loop's last read and the rename).
 *
 * `idReadPlan` drives the OTHER transient state a rival's takeover produces:
 * the id file is momentarily GONE (renamed aside), so a read throws ENOENT for
 * a step or two while the winner's bytes are still on their way back. That is
 * "no id yet", never "an unreadable id file".
 */
const race = vi.hoisted(() => ({
  hideIdFile: false,
  blankIdReads: 0,
  takeoverLosesTo: null as string | null,
  leftoverHolds: null as string | null,
  wxCreates: 0,
  /** Per-read outcomes for the id file, consumed in order — see the module note. */
  idReadPlan: [] as Array<'blank' | 'missing'>,
}))

// `mcp/src/telemetry.ts` resolves its id file from `homedir()` at module load,
// so the whole test runs against a throwaway home. Everything else on node:os
// is the real module.
vi.mock('node:os', async () => {
  const actual = await vi.importActual<typeof NodeOs>('node:os')
  return { ...actual, homedir: () => join(actual.tmpdir(), 'mlcl-mcp-telemetry-id-home') }
})

// The same home, seen through node:fs: `existsSync` reports the file as absent
// on demand (the stat that happened BEFORE another writer published), and
// `readFileSync` reports it as EMPTY on demand (a winner observed between its
// exclusive create and its write), while every real read/write still touches it.
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof NodeFs>('node:fs')
  const realReadFileSync = actual.readFileSync as (path: unknown, ...rest: unknown[]) => unknown
  const realWriteFileSync = actual.writeFileSync as (path: unknown, ...rest: unknown[]) => unknown
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
    readFileSync: (path: unknown, ...rest: unknown[]) => {
      if (String(path).endsWith('.mlcl/telemetry-id') && race.idReadPlan.length > 0) {
        const step = race.idReadPlan.shift()
        if (step === 'missing') {
          const missing = new Error(
            `ENOENT: no such file or directory, open '${String(path)}'`,
          ) as NodeJS.ErrnoException
          missing.code = 'ENOENT'
          throw missing
        }
        return ''
      }
      if (race.blankIdReads > 0 && String(path).endsWith('.mlcl/telemetry-id')) {
        race.blankIdReads -= 1
        return ''
      }
      if (
        race.leftoverHolds !== null &&
        String(path).endsWith(`telemetry-id.empty.${process.pid}`)
      ) {
        return race.leftoverHolds
      }
      return realReadFileSync(path, ...rest)
    },
    writeFileSync: (path: unknown, data: unknown, options?: { flag?: string }) => {
      // The takeover is the SECOND exclusive create of the call (the first
      // fails naturally on the seeded file), so the counter is what tells the
      // simulated rival's win apart from the loser's own first attempt.
      if (options?.flag === 'wx' && String(path).endsWith('.mlcl/telemetry-id')) {
        race.wxCreates += 1
        if (race.takeoverLosesTo !== null && race.wxCreates >= 2) {
          const rivalId = race.takeoverLosesTo
          race.takeoverLosesTo = null
          realWriteFileSync(path as never, rivalId)
          const eexist = new Error('EEXIST: file already exists') as NodeJS.ErrnoException
          eexist.code = 'EEXIST'
          throw eexist
        }
      }
      return realWriteFileSync(path as never, data as never, options as never)
    },
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
  race.hideIdFile = false
  race.blankIdReads = 0
  race.takeoverLosesTo = null
  race.leftoverHolds = null
  race.wxCreates = 0
  race.idReadPlan = []
  fetchMock = vi.fn().mockResolvedValue({ ok: true })
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch
})

afterEach(() => {
  globalThis.fetch = ORIGINAL_FETCH
  race.hideIdFile = false
  race.blankIdReads = 0
  race.takeoverLosesTo = null
  race.leftoverHolds = null
  race.wxCreates = 0
  race.idReadPlan = []
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

  it('adopts an id a live writer published while our exclusive create was failing', () => {
    // The window `wx` cannot close on its own: it CREATES the name before it
    // writes the bytes, so a process that lost the create can read the file
    // while the winner is mid-write and see ''. Reading that as "no id" and
    // publishing ours over it split one install across two anonymousIds — the
    // same split the exclusive create exists to prevent, reached through the
    // empty-file branch instead of the create. The read is reported as empty
    // twice, then the winner's bytes appear.
    const winner = '77777777-6666-4555-8444-333333333333'
    writeFileSync(ID_FILE, winner)
    race.blankIdReads = 2
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.blankIdReads = 0
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(winner)
    // …and the winner's id survives: the loser must not publish its own id over
    // one that was already there.
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

  it('takes an empty leftover over with an exclusive create, and adopts a rival that wins the freed name', () => {
    // A dead winner left the file empty and the adopt loop ran dry: the
    // takeover renames the empty file aside and re-creates exclusively. A
    // rival that wins the freed name in that gap must be ADOPTED — a
    // truncating in-place write (the old fallback) published our id over the
    // rival's instead, while both events already carried their own id: one
    // install split across two anonymousIds, the failure the exclusive create
    // exists to prevent, reached through this fallback.
    const rival = 'aaaa1111-2222-4333-8444-555555555555'
    writeFileSync(ID_FILE, '')
    // The `existing` read plus the whole adopt loop see the empty leftover.
    race.blankIdReads = 1 + 20
    race.takeoverLosesTo = rival
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.takeoverLosesTo = null
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(rival)
    // …and the rival's id survives as the install's id.
    expect(readFileSync(ID_FILE, 'utf8')).toBe(rival)
  })

  it('puts a live writer’s bytes back when the takeover renamed them aside', () => {
    // The window between the adopt loop's last read and the rename: a live
    // writer's id landed on the file the takeover then moved aside. The moved
    // bytes are the id this install must keep — renamed back and adopted, not
    // dropped as the empty leftover the loop had (momentarily) observed.
    const liveWriter = 'bbbb2222-3333-4444-8555-666666666666'
    writeFileSync(ID_FILE, '')
    race.blankIdReads = 1 + 20
    race.leftoverHolds = liveWriter
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.leftoverHolds = null
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(liveWriter)
    // …and the bytes really are the file's id again, not just this event's: a
    // restore that reported the id while leaving an empty file behind would
    // split the very next call onto a freshly minted one.
    expect(readFileSync(ID_FILE, 'utf8')).toBe(liveWriter)
  })

  it('adopts a rival that took the freed name while the live writer’s bytes were being restored', () => {
    // The restore above must not REPLACE a file that appeared in the gap: a
    // rival's exclusive create publishes only because the takeover freed the
    // name, and rename(2) — the shape this restore used to be — atomically
    // overwrites its destination, so the id that rival had already put on its
    // own event was destroyed while its file silently became this call's
    // captured bytes. One install, two anonymousIds.
    //
    // The rival's write is the second exclusive create of the call (the first
    // fails naturally on the seeded empty file), which is exactly the step
    // `takeoverLosesTo` intercepts.
    const liveWriter = 'bbbb2222-3333-4444-8555-666666666666'
    const rival = 'cccc3333-4444-4555-8666-777777777777'
    writeFileSync(ID_FILE, '')
    race.blankIdReads = 1 + 20
    race.leftoverHolds = liveWriter
    race.takeoverLosesTo = rival
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.leftoverHolds = null
      race.takeoverLosesTo = null
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(rival)
    expect(readFileSync(ID_FILE, 'utf8')).toBe(rival)
  })

  it('reads a momentarily missing id file as “no id yet”, not as an unreadable one', () => {
    // A rival's takeover renames the id file aside, so a read lands in the gap
    // and fails ENOENT. That is the state the adopt loop exists to wait out —
    // not the unreadable-file case whose net is the `'unknown'` anonymousId,
    // which would put a blank id on this event.
    const winner = 'dddd4444-5555-4666-8777-888888888888'
    writeFileSync(ID_FILE, winner)
    race.idReadPlan = ['missing']
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.idReadPlan = []
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(winner)
    expect(readFileSync(ID_FILE, 'utf8')).toBe(winner)
  })

  it('keeps waiting when the id file is renamed aside mid-adopt', () => {
    // Same gap, one step later: the winner was observed mid-write (an empty
    // read), our exclusive create lost, and the FIRST read of the adopt loop
    // finds the name gone (a rival renamed it aside). The winner's bytes land
    // a moment later — the loop's own wait is what catches them. Treating the
    // ENOENT as "unreadable" reported a blank anonymousId instead.
    const winner = 'eeee5555-6666-4777-8888-999999999999'
    writeFileSync(ID_FILE, winner)
    race.idReadPlan = ['blank', 'missing']
    try {
      trackToolCall('search_packages', true, Date.now())
    } finally {
      race.idReadPlan = []
    }

    expect(payloadOf(fetchMock).event.anonymousId).toBe(winner)
    expect(readFileSync(ID_FILE, 'utf8')).toBe(winner)
  })
})
