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
 * per-install id in ~/.mlcl/telemetry-id, shared with the CLI), fire-and-
 * forget with a 5s timeout, no-op without a reachable endpoint. Emit failures
 * are swallowed — logged only under MLCL_DEBUG=1, like the CLI.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

function installId(): string {
  try {
    if (existsSync(ID_FILE)) return readFileSync(ID_FILE, 'utf8').trim()
    const id = randomUUID()
    mkdirSync(join(ID_FILE, '..'), { recursive: true, mode: 0o700 })
    writeFileSync(ID_FILE, id, { mode: 0o600 })
    return id
  } catch (_error) {
    // Telemetry must never break a tool call over an unreadable id file —
    // report the anonymous 'unknown' id and move on.
    return 'unknown'
  }
}

/** Fire-and-forget `mcp.tool_call` event — never throws, never blocks. */
export function trackToolCall(tool: string, ok: boolean, startedAt: number): void {
  if (!telemetryEnabled()) return
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
  void fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5_000),
  }).catch((error: unknown) => {
    // Telemetry must never break a tool call — but MLCL_DEBUG=1 promises
    // inspectable traffic (mlcl README, "Telemetry & privacy"), so an emit
    // failure is logged there, the same as the CLI's.
    if (process.env.MLCL_DEBUG === '1') console.error('[telemetry] emit failed:', error)
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
      trackToolCall(tool, true, startedAt)
      return result
    } catch (error) {
      trackToolCall(tool, false, startedAt)
      throw error
    }
  }
}
