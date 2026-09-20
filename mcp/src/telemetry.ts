/**
 * Anonymous, opt-out tool-call telemetry for molecule-mcp — same wire
 * contract as mlcl's telemetry (the @molecule/api-analytics-http bond's
 * payload shape), emitted with a plain fetch so the server carries zero
 * unpublished npm dependencies. Swap to the bond itself once
 * @molecule/api-analytics-http publishes (identical payload; the endpoint
 * will not notice).
 *
 * Posture mirrors mlcl: opt-out (MOLECULE_TELEMETRY=0), anonymous (a random
 * per-install id in ~/.mlcl/telemetry-id, shared with the CLI), fire-and-
 * forget with a 5s timeout, no-op without a reachable endpoint.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

const DEFAULT_URL = 'https://api.molecule.dev/v1/telemetry/cli'
const ID_FILE = join(homedir(), '.mlcl', 'telemetry-id')

export function telemetryEnabled(): boolean {
  return process.env.MOLECULE_TELEMETRY !== '0'
}

function installId(): string {
  try {
    if (existsSync(ID_FILE)) return readFileSync(ID_FILE, 'utf8').trim()
    const id = randomUUID()
    mkdirSync(join(ID_FILE, '..'), { recursive: true, mode: 0o700 })
    writeFileSync(ID_FILE, id, { mode: 0o600 })
    return id
  } catch {
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
        serverVersion: '0.1.0',
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
  }).catch(() => {
    /* telemetry must never break a tool call */
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
