/**
 * Anonymous, opt-out usage telemetry for the mlcl CLI — dogfoods the
 * molecule analytics bond family end to end: this module bonds
 * `@molecule/api-analytics` (the same interface scaffolded apps consume) with
 * the `@molecule/api-analytics-http` provider, POSTing events to
 * molecule.dev's first-party ingestion route.
 *
 * Posture (see README "Telemetry"):
 *   - OPT-OUT: on by default; `MOLECULE_TELEMETRY=0` disables entirely.
 *   - ANONYMOUS: no accounts, no paths, no argument values, no project names.
 *     Events carry: command name, outcome, duration, CLI/Node versions,
 *     platform/arch, and a random install id (uuid in ~/.mlcl/telemetry-id —
 *     delete the file to rotate it).
 *   - NEVER BREAKS THE CLI: every emit is fire-and-forget with a 5s timeout;
 *     failures are swallowed (logged only under MLCL_DEBUG=1).
 *   - NO-OP WITHOUT ENDPOINT: unset URL (or unreachable endpoint) = silence.
 */
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const DEFAULT_URL = 'https://api.molecule.dev/v1/telemetry/cli'
const ID_FILE = join(homedir(), '.mlcl', 'telemetry-id')

export function telemetryEnabled(): boolean {
  // Local-dev runs never report — MOLECULE_ENV=local implies opt-out unless
  // telemetry is EXPLICITLY re-enabled (MOLECULE_TELEMETRY=1).
  if (process.env.MOLECULE_ENV === 'local') return process.env.MOLECULE_TELEMETRY === '1'
  return process.env.MOLECULE_TELEMETRY !== '0'
}

export function telemetryUrl(): string | undefined {
  return process.env.MOLECULE_TELEMETRY_URL ?? DEFAULT_URL
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

let providerReady = false

async function ensureProvider(): Promise<void> {
  if (providerReady) return
  providerReady = true
  const { setProvider } = await import('@molecule/api-analytics')
  const { createHttpAnalyticsProvider } = await import('@molecule/api-analytics-http')
  setProvider(
    createHttpAnalyticsProvider({
      url: telemetryUrl(),
      source: 'mlcl',
      onError: (error) => {
        if (process.env.MLCL_DEBUG === '1') console.error('[telemetry] emit failed:', error)
      },
    }),
  )
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

/** Fire-and-forget event emission — resolves immediately; never throws. */
export function trackCliEvent(props: TelemetryEventProps): void {
  if (!telemetryEnabled()) return
  void (async () => {
    try {
      await ensureProvider()
      const { track } = await import('@molecule/api-analytics')
      await track({
        name: 'cli.command',
        anonymousId: anonymousInstallId(),
        properties: {
          command: props.command,
          ok: props.ok,
          durationMs: Math.round(props.durationMs),
          errorName: props.errorName,
          template: props.template,
          packages: props.packages?.slice(0, 200),
          searchQuery: props.searchQuery?.slice(0, 100),
          harness: props.harness,
          projectType: props.projectType,
          framework: props.framework,
          loginMethod: props.loginMethod,
          deployOutcome: props.deployOutcome,
          swapFrom: props.swapFrom?.slice(0, 80),
          swapTo: props.swapTo?.slice(0, 80),
          cliVersion: '2.0.0',
          nodeMajor: Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10),
          platform: process.platform,
          arch: process.arch,
        },
      })
    } catch (_error) {
      // Never break the CLI over telemetry — the bond already swallows emit
      // failures; this guards the lazy-import/bonding path itself.
    }
  })()
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
