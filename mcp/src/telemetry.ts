/**
 * Anonymous, opt-out tool-call telemetry for molecule-mcp — same wire
 * contract as mlcl's telemetry (the @molecule/api-analytics-http bond's
 * payload shape: { kind, source, sentAt, event }), emitted with a plain
 * fetch. That bond has since published (mlcl's CLI bonds it), but this
 * server still hand-rolls the POST to keep its dependency list free of
 * @molecule/* packages; the payload shape parity above is what keeps the
 * endpoint indifferent.
 *
 * Posture mirrors mlcl (see the mlcl README's "Telemetry & privacy"): opt-out
 * (MOLECULE_TELEMETRY=0 or DO_NOT_TRACK=1; a local MOLECULE_ENV=local run stays
 * silent unless MOLECULE_TELEMETRY=1 re-enables it), anonymous (a random
 * per-install id in ~/.mlcl/telemetry-id, shared with the CLI), fire-and-forget
 * with a 5s timeout, no-op without a reachable endpoint. Emit failures are
 * swallowed — logged only under MLCL_DEBUG=1, like the CLI. Emits are also
 * BOUNDED in flight ({@link MAX_IN_FLIGHT_EMITS}) and dropped past that bound,
 * so incoming traffic cannot turn into unbounded outbound load.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_URL = 'https://api.molecule.dev/v1/telemetry/cli'
const ID_FILE = join(homedir(), '.mlcl', 'telemetry-id')

let cachedVersion: string | null = null

/**
 * The server's own version, read once from mcp/package.json — the same field
 * `bin/*` and the SDK's serverInfo report. A hardcoded copy here (and in the
 * McpServer constructor) went stale the first time the package was bumped, so
 * the telemetry's `serverVersion` described a server that was not deployed.
 */
export function serverVersion(): string {
  if (cachedVersion === null) {
    let resolved: string
    try {
      const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
      resolved = typeof manifest.version === 'string' ? manifest.version : 'unknown'
    } catch (_error) {
      // A missing/unparseable manifest must not take the server down over a
      // version string — report 'unknown' instead.
      resolved = 'unknown'
    }
    cachedVersion = resolved
  }
  return cachedVersion
}

export function telemetryEnabled(): boolean {
  // The cross-tool opt-out convention (https://consoledonottrack.com) — the
  // same check the CLI runs, which both READMEs promise for molecule-mcp.
  if (process.env.DO_NOT_TRACK === '1') return false
  // Local-dev runs never report — MOLECULE_ENV=local implies opt-out unless
  // telemetry is EXPLICITLY re-enabled (MOLECULE_TELEMETRY=1).
  if (process.env.MOLECULE_ENV === 'local') return process.env.MOLECULE_TELEMETRY === '1'
  return process.env.MOLECULE_TELEMETRY !== '0'
}

/**
 * How many times {@link installId} re-reads an id file a live writer is
 * momentarily leaving empty, and the pause between those reads: 20 × 5 ms is
 * far longer than the window between a winner's exclusive create and its write,
 * and short enough that only the genuinely-empty-file case pays it.
 */
const ID_ADOPT_ATTEMPTS = 20
/** The pause between {@link installId}'s re-reads — see {@link ID_ADOPT_ATTEMPTS}. */
const ID_ADOPT_WAIT_MS = 5

/** A bounded synchronous sleep, so the adopt loop above cannot yield to the caller. */
function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/**
 * Read the id file, waiting out a live writer's bytes — the adopt loop, shared by
 * the EEXIST branch of {@link installId} and its empty-leftover takeover.
 *
 * A read that fails ENOENT is "no id there RIGHT NOW", never "unreadable id
 * file": the name is momentarily gone because a rival's exclusive-create
 * takeover renamed the file aside (see {@link installId}), which is exactly the
 * state this loop exists to wait out. Letting the ENOENT escape put it on
 * {@link installId}'s outer catch, whose `'unknown'` id is the net for a file
 * that cannot be read AT ALL — so a process racing a takeover reported a blank
 * anonymousId for that event, the split-across-two-ids failure this whole
 * module is built to avoid, reached through the wait instead of the create.
 *
 * @returns The published id, or null when the file still reads empty (or is
 *   still gone) after {@link ID_ADOPT_ATTEMPTS} tries.
 */
function readPublishedId(): string | null {
  for (let attempt = 0; attempt < ID_ADOPT_ATTEMPTS; attempt++) {
    let won: string
    try {
      won = readFileSync(ID_FILE, 'utf8').trim()
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
      // Gone for now — keep waiting for the winner's bytes.
      sleepSync(ID_ADOPT_WAIT_MS)
      continue
    }
    if (won) return won
    sleepSync(ID_ADOPT_WAIT_MS)
  }
  return null
}

function installId(): string {
  try {
    if (existsSync(ID_FILE)) {
      // A read that fails ENOENT is the file that was there a moment ago and is
      // gone NOW — a rival's takeover renamed it aside. That is "no id to adopt
      // yet", not an unreadable id file, so it falls through to the exclusive
      // create below (which either publishes this process's id or adopts the
      // winner's) instead of reaching the outer catch's `'unknown'` id, which is
      // the net for a file that cannot be read at all.
      let existing = ''
      try {
        existing = readFileSync(ID_FILE, 'utf8').trim()
      } catch (error) {
        if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') throw error
      }
      // A ZERO-LENGTH id file must not become the permanent anonymous id:
      // writeFileSync opens with O_TRUNC before it writes, so a crash or a full
      // disk between the two leaves an empty file — and an early return here
      // would then read that '' back on every later run, reporting a blank
      // anonymousId for the life of the install. Fall through and mint one
      // (the write below fills the empty file in).
      if (existing) return existing
    }
    const id = randomUUID()
    mkdirSync(join(ID_FILE, '..'), { recursive: true, mode: 0o700 })
    try {
      // Exclusive create. The read above and this write are not atomic, and two
      // processes sharing one `~/.mlcl` (the stdio server plus a hosted
      // instance, two tool calls on their first use) can both reach here: a
      // plain write published whichever id landed LAST while the loser's event
      // already carried its own, splitting one install across two anonymousIds.
      // `wx` makes the second writer fail instead, and it then adopts the id the
      // winner published.
      writeFileSync(ID_FILE, id, { mode: 0o600, flag: 'wx' })
      return id
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'EEXIST') throw error
      // Lost the race. An EMPTY file is either the winner mid-write — `wx`
      // opens the name before it writes the bytes, so a live writer is
      // momentarily observable as an empty file — or a writer that died
      // between its open and its write (see the zero-length note above). The
      // two are indistinguishable by content, so WAIT briefly for the winner's
      // bytes before deciding: reading that window as "no id" published ours
      // over a live holder's, splitting one install across two anonymousIds —
      // the exact failure the exclusive create exists to prevent, reached
      // through the empty-file branch instead of the create.
      const adopted = readPublishedId()
      if (adopted) return adopted
      // Still empty after that budget: a genuinely empty leftover file (no
      // live writer writes for that long), so this process takes the name
      // over — through the SAME exclusive create the winner used, never a
      // truncating in-place write. Two processes that exhausted the wait
      // together each published over the other with `writeFileSync` (default
      // 'w': truncate, then write) — the last truncate won while BOTH events
      // already carried their own id, so one install was split across two
      // anonymousIds, the exact failure the exclusive create exists to
      // prevent, reached once more through this fallback — and each truncate
      // read as a fresh empty file to the next reader's adopt loop. Renaming
      // the empty file aside (a per-pid name, so a rival's own takeover can
      // never replace it) frees the name for a `wx` create: exactly one
      // process publishes, and every loser lands back in this EEXIST branch
      // and adopts the winner's bytes.
      const leftover = `${ID_FILE}.empty.${process.pid}`
      try {
        renameSync(ID_FILE, leftover)
      } catch (_error) {
        // The name is already gone — a rival took it over first. The exclusive
        // create below settles which of us publishes.
      }
      let moved: string | null = null
      try {
        moved = readFileSync(leftover, 'utf8').trim() || null
      } catch (_error) {
        // The moved file could not be read — treat it as the empty leftover
        // this takeover took it for.
      }
      if (moved !== null) {
        // A live writer's bytes landed between the adopt loop's last read and
        // the rename: the file we just moved holds the id this install must
        // keep. Put it back — through the SAME exclusive create the winner
        // used, which is the only operation here that cannot replace a file
        // that appeared in the meantime. `rename` (what this used to be) is
        // NOT that operation: rename(2) atomically REPLACES its destination, so
        // a rival that took the freed name in the gap had the id it had just
        // published silently overwritten by the bytes captured here — while its
        // own event already carried that id, splitting one install across two
        // anonymousIds, the failure this whole function exists to prevent.
        // `wx` fails with EEXIST instead, and the rival's bytes are adopted so
        // the file and the reported id agree.
        let published = moved
        try {
          writeFileSync(ID_FILE, moved, { mode: 0o600, flag: 'wx' })
        } catch (putBackError) {
          if ((putBackError as NodeJS.ErrnoException)?.code !== 'EEXIST') throw putBackError
          // A rival re-took the name in the gap: its bytes are the install's id
          // now (its own event already carries them). Adopt them so the file
          // and the reported id name the same install; an empty file there is a
          // rival mid-write, which the captured bytes answer for instead.
          try {
            published = readFileSync(ID_FILE, 'utf8').trim() || moved
          } catch (_readError) {
            published = moved
          }
        }
        try {
          rmSync(leftover, { force: true })
        } catch (_error) {
          // Inert litter beside the id file; the id itself is published.
        }
        return published
      }
      try {
        rmSync(leftover, { force: true })
      } catch (_error) {
        // Inert litter; the publish below needs only the freed name.
      }
      try {
        writeFileSync(ID_FILE, id, { mode: 0o600, flag: 'wx' })
        return id
      } catch (takeoverError) {
        if ((takeoverError as NodeJS.ErrnoException)?.code !== 'EEXIST') throw takeoverError
        // A rival published while this one renamed — adopt its bytes with the
        // same short wait as the loop above. Exhausted here too, the failure
        // reaches the outer catch, which reports the anonymous 'unknown' id
        // rather than publishing a second id over a rival's.
        const won = readPublishedId()
        if (won) return won
        throw takeoverError
      }
    }
  } catch (_error) {
    // Telemetry must never break a tool call over an unreadable id file —
    // report the anonymous 'unknown' id and move on.
    return 'unknown'
  }
}

/**
 * How many telemetry emits may be in flight at once.
 *
 * The hosted server is public and unauthenticated, and its request budget is
 * per client ADDRESS — so a flood from many addresses (a botnet, or a
 * header-rotating client on an unguarded proxy) stays inside each address's own
 * budget. Every accepted tool call started one outbound POST here and nothing
 * bounded them: a burst of B calls held B pending requests, B abort timers and B
 * socket slots for the 5 s the timeout allows, growing with the incoming rate
 * instead of with the work the server owes anyone. An emit is best-effort (see
 * the module note, and the CLI's telemetry posture), so the overflow is DROPPED
 * rather than queued — a queue is exactly the unbounded thing this bound exists
 * to prevent, and a dropped event costs nothing but the comparison below.
 */
export const MAX_IN_FLIGHT_EMITS = 8

/** Emits started and not yet settled — see {@link MAX_IN_FLIGHT_EMITS}. */
let inFlightEmits = 0

/**
 * Whether a RESOLVED tool result is the MCP SDK's declared failure shape.
 *
 * A tool can fail in two ways: it throws (the wrapper sees the rejection), or it
 * resolves with `isError: true` — which is how this server reports every
 * hosted-service failure (`serviceResult` turns a `ServiceCallError` into that
 * content block so the calling agent reads a sentence instead of a protocol
 * error). A wrapper that watched only for the throw recorded every "no project
 * API key", 401 "the key was rejected", 402 allowance, and "the service returned
 * no …" answer as a SUCCESS, so the flag that exists to make this server's
 * failures visible counted exactly those failures as good calls. The emitted
 * flag follows what the CLIENT sees.
 *
 * @param result - The value a wrapped handler resolved with.
 * @returns True when the result carries `isError: true`.
 */
function isErrorResult(result: unknown): boolean {
  return (
    typeof result === 'object' &&
    result !== null &&
    (result as { isError?: unknown }).isError === true
  )
}

/**
 * Fire-and-forget `mcp.tool_call` event — never throws, never blocks, and never
 * queues: once {@link MAX_IN_FLIGHT_EMITS} emits are in flight this call is
 * dropped.
 */
export function trackToolCall(tool: string, ok: boolean, startedAt: number): void {
  if (!telemetryEnabled()) return
  // Saturated — drop this event. Deliberately above the payload below: nothing
  // on the dropped path reads the id file from disk or builds a body.
  if (inFlightEmits >= MAX_IN_FLIGHT_EMITS) return
  const url = process.env.MOLECULE_TELEMETRY_URL ?? DEFAULT_URL
  const payload = {
    kind: 'track',
    source: 'molecule-mcp',
    sentAt: new Date().toISOString(),
    event: {
      name: 'mcp.tool_call',
      anonymousId: installId(),
      properties: {
        tool,
        ok,
        durationMs: Math.round(Date.now() - startedAt),
        serverVersion: serverVersion(),
        nodeMajor: Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10),
        platform: process.platform,
        arch: process.arch,
      },
    },
  }
  inFlightEmits++
  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  })
    .catch((error: unknown) => {
      // Telemetry must never break a tool call — but MLCL_DEBUG=1 promises
      // inspectable traffic (mlcl README, "Telemetry & privacy"), so an emit
      // failure is logged there, the same as the CLI's.
      if (process.env.MLCL_DEBUG === '1') console.error('[telemetry] emit failed:', error)
    })
    .finally(() => {
      // The slot is released on EVERY outcome (resolved, rejected, aborted by
      // the timeout above), so a saturated server unblocks itself as its own
      // emits settle instead of going silent for the life of the process.
      inFlightEmits--
    })
}

/** Wrap a tool handler with emission — used by every registerTool call. */
export function tracked<Args, Result>(
  tool: string,
  handler: (args: Args) => Promise<Result>,
): (args: Args) => Promise<Result> {
  return async (args: Args): Promise<Result> => {
    const startedAt = Date.now()
    try {
      const result = await handler(args)
      // A resolved handler is not necessarily a SUCCESSFUL tool call: see
      // isErrorResult — the hosted-service tools report their failures this way.
      trackToolCall(tool, !isErrorResult(result), startedAt)
      return result
    } catch (error) {
      trackToolCall(tool, false, startedAt)
      throw error
    }
  }
}
