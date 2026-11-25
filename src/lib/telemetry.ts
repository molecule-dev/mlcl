/**
 * Anonymous, opt-out usage telemetry for the mlcl CLI — dogfoods the
 * molecule analytics bond family end to end: this module bonds
 * `@molecule/api-analytics` (the same interface scaffolded apps consume) with
 * the `@molecule/api-analytics-http` provider, POSTing events to
 * molecule.dev's first-party ingestion route.
 *
 * Posture (see README "Telemetry"):
 *   - OPT-OUT: on by default; `MOLECULE_TELEMETRY=0` or the standard `DO_NOT_TRACK=1`
 *     disables entirely.
 *   - ANONYMOUS: no accounts, no paths, no argument values, no project names.
 *     Events carry: command name, outcome, duration, CLI/Node versions,
 *     platform/arch, and a random install id (uuid in ~/.mlcl/telemetry-id —
 *     delete the file to rotate it).
 *   - NEVER SLOWS OR BREAKS THE CLI: each event goes to a detached process
 *     (./telemetry-send.ts), so the command exits without waiting on the network.
 *     That process gives up after 5 s; failures are swallowed (shown only under
 *     MLCL_DEBUG=1). Sent from the command's own process, an open request kept
 *     Node from exiting: every command ended only when the collector answered,
 *     5 s behind a firewall that drops packets (harness eval `add`, 2026-11-25).
 *   - NO-OP WITHOUT ENDPOINT: unset URL (or unreachable endpoint) = silence.
 */
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { apiBaseUrl } from './platform.js'

const ID_FILE = join(homedir(), '.mlcl', 'telemetry-id')

export function telemetryEnabled(): boolean {
  // The cross-tool opt-out convention (https://consoledonottrack.com).
  if (process.env.DO_NOT_TRACK === '1') return false
  // Local-dev runs never report — MOLECULE_ENV=local implies opt-out unless
  // telemetry is EXPLICITLY re-enabled (MOLECULE_TELEMETRY=1).
  if (process.env.MOLECULE_ENV === 'local') return process.env.MOLECULE_TELEMETRY === '1'
  return process.env.MOLECULE_TELEMETRY !== '0'
}

/**
 * The ingestion route under the same API root every other CLI call uses
 * ({@link apiBaseUrl}). It used to be a separate literal without the `/api`
 * prefix the API mounts its routes under, so every event 404'd and no CLI
 * usage was ever recorded.
 *
 * @returns The telemetry endpoint URL.
 */
export function telemetryUrl(): string | undefined {
  return process.env.MOLECULE_TELEMETRY_URL ?? `${apiBaseUrl()}/v1/telemetry/cli`
}

/** Random per-install id — the ONLY cross-event identifier. Rotate by deleting the file. */
export function anonymousInstallId(): string {
  try {
    if (existsSync(ID_FILE)) return readFileSync(ID_FILE, 'utf8').trim()
    const id = randomUUID()
    mkdirSync(join(ID_FILE, '..'), { recursive: true, mode: 0o700 })
    writeFileSync(ID_FILE, id, { mode: 0o600 })
    return id
  } catch (_error) {
    // An unreadable/writable-less home dir just means no stable install id —
    // 'unknown' still groups this machine's events coarsely.
    return 'unknown'
  }
}

/** This CLI's version, from its package.json (two levels up from both src/lib and dist/lib). */
function cliVersion(): string {
  try {
    const manifest = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { version?: unknown }
    return typeof manifest.version === 'string' ? manifest.version : 'unknown'
  } catch (_error) {
    // A copy without its package.json still reports the event.
    return 'unknown'
  }
}

/** The flags of `argv` that load code before a module (`--import tsx`, `--require=x`). */
function loaderFlags(argv: readonly string[]): string[] {
  const kept: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]!
    if (
      /^(--import|--require|-r|--loader|--experimental-loader)$/.test(flag) &&
      i + 1 < argv.length
    )
      kept.push(flag, argv[++i]!)
    else if (/^--(import|require|loader|experimental-loader)=/.test(flag)) kept.push(flag)
  }
  return kept
}

/**
 * Hand one event to a detached `telemetry-send` process and return at once: nothing in this
 * process waits for it, so the command exits on its own schedule.
 *
 * @param url - The collector endpoint.
 * @param event - The event to send.
 */
function sendDetached(url: string, event: Record<string, unknown>): void {
  const self = fileURLToPath(import.meta.url)
  const ext = extname(self)
  const sender = join(dirname(self), `telemetry-send${ext}`)
  // From source (`.ts`), the loader this process runs under (tsx) runs the sender too. Only the
  // loader flags pass on: an `-e` would run its code instead, an `--inspect` claim the debugger port.
  const flags = ext === '.ts' ? loaderFlags(process.execArgv) : []
  const debug = process.env.MLCL_DEBUG === '1'
  const child = spawn(process.execPath, [...flags, sender, url, JSON.stringify(event)], {
    detached: true,
    stdio: ['ignore', 'ignore', debug ? 'inherit' : 'ignore'],
    windowsHide: true,
  })
  child.on('error', (error) => {
    if (debug) console.error('[telemetry] could not start the sender:', error)
  })
  child.unref()
}

export interface TelemetryEventProps {
  command: string
  ok: boolean
  durationMs: number
  errorName?: string
  /** Product metadata — no PII, no user content. */
  template?: string
  packages?: string
  searchQuery?: string
  harness?: string
  projectType?: string
  framework?: string
  loginMethod?: string
  deployOutcome?: string
  swapFrom?: string
  swapTo?: string
}

/**
 * Keep only the names of PUBLIC molecule packages from a comma-separated list. A package name is
 * product metadata when it is one of ours; a private or personal package a user adds is theirs.
 *
 * @param value - A comma-separated list of package names.
 * @returns The `@molecule/*` names, comma-separated, or undefined when none remain.
 */
export function publicPackageNames(value: string | undefined): string | undefined {
  if (!value) return undefined
  const kept = value
    .split(',')
    .map((name) => name.trim())
    .filter((name) => /^@molecule\/[a-z0-9-]+$/.test(name))
  return kept.length > 0 ? kept.join(',') : undefined
}

/** Send the event from a detached process ({@link sendDetached}): returns at once, never throws. */
export function trackCliEvent(props: TelemetryEventProps): void {
  if (!telemetryEnabled()) return
  const url = telemetryUrl()
  if (!url) return
  try {
    sendDetached(url, {
      name: 'cli.command',
      anonymousId: anonymousInstallId(),
      properties: {
        command: props.command,
        ok: props.ok,
        durationMs: Math.round(props.durationMs),
        errorName: props.errorName,
        template: props.template,
        packages: publicPackageNames(props.packages)?.slice(0, 200),
        // A search query is free text a person typed: never sent.
        harness: props.harness,
        projectType: props.projectType,
        framework: props.framework,
        loginMethod: props.loginMethod,
        deployOutcome: props.deployOutcome,
        swapFrom: publicPackageNames(props.swapFrom)?.slice(0, 80),
        swapTo: publicPackageNames(props.swapTo)?.slice(0, 80),
        cliVersion: cliVersion(),
        nodeMajor: Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10),
        platform: process.platform,
        arch: process.arch,
      },
    })
  } catch (error) {
    // Never break the CLI over telemetry: a sender that cannot start (no process slots) loses one event.
    if (process.env.MLCL_DEBUG === '1') console.error('[telemetry] not sent:', error)
  }
}

/**
 * Stash product metadata for the postrun hook to pick up. Commands call this
 * with their parsed flags — the hook reads and clears it after the command
 * finishes, so it never leaks between invocations.
 *
 * @example
 * ```typescript
 * setTelemetryContext({ template: flags.template, packages: flags.packages })
 * ```
 */
export function setTelemetryContext(context: Record<string, string | undefined>): void {
  const g = globalThis as { __mlclTelemetryContext?: Record<string, string> }
  const existing = g.__mlclTelemetryContext ?? {}
  const clean: Record<string, string> = {}
  for (const [k, v] of Object.entries({ ...existing, ...context })) {
    if (typeof v === 'string' && v.length > 0) clean[k] = v
  }
  g.__mlclTelemetryContext = clean
}
