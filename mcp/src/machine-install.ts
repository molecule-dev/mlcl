/**
 * The machine install of molecule-mcp: `~/.mlcl/mcp/`, which `mlcl setup` registers with each agent
 * as `node ~/.mlcl/mcp/run.mjs`.
 *
 * An agent that starts `npx -y molecule-mcp` waits for npm to start and ask the registry which
 * version is `latest`, on every launch: 1.2-1.4 s in the harness evals, 70 s with the registry
 * unreachable, and a download on each release day. Headless Claude Code waits about 2 s for its
 * servers and then begins without them, so 3 of 10 eval sessions started with the server still
 * pending and no Molecule tool listed. Started from an installed copy, the server answers
 * `initialize` in 0.1 s.
 *
 * Layout: `run.mjs` (the launcher), `current.json` (`{"version": …}`), and one directory per
 * version under `versions/`, never changed once written, so a running server never has its files
 * replaced. A version becomes current only after it has answered `initialize`, and the switch is
 * one rename. Updates run after the server has connected, at most once a day, in a detached child
 * (`startBackgroundUpdate`); `MOLECULE_MCP_NO_UPDATE=1` turns them off.
 *
 * @module
 */

import { execFileSync, spawn, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The package root of the running copy (`dist/..`). */
const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

/** The variable `run.mjs` sets for the server it starts: the machine install's directory. */
export const MACHINE_HOME_ENV = 'MOLECULE_MCP_HOME'

/** Set to `1` to never check for a newer version in the background. */
export const NO_UPDATE_ENV = 'MOLECULE_MCP_NO_UPDATE'

/** How often the background check runs at most. */
export const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000

/** A lock older than this belongs to an updater that died. */
const STALE_LOCK_MS = 15 * 60 * 1000

/**
 * The launcher `run.mjs`: start the version `current.json` names, or say in one line why not.
 * It imports that version's `bin/run.js`, which starts the server.
 */
export const LAUNCHER = `// molecule-mcp, as \`mlcl setup\` installed it: starts the version current.json names.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const fail = (why) => {
  process.stderr.write(\`molecule-mcp: \${why}. Run \\\`npx mlcl setup\\\` to install it again.\\n\`)
  process.exit(1)
}
if (Number(process.versions.node.split('.')[0]) < 22) fail(\`Node \${process.versions.node} is older than 22\`)
let version
try {
  version = JSON.parse(readFileSync(new URL('current.json', import.meta.url), 'utf8')).version
} catch {
  fail('no installed version')
}
process.env.${MACHINE_HOME_ENV} = fileURLToPath(new URL('.', import.meta.url))
const bin = new URL(\`versions/\${version}/node_modules/molecule-mcp/bin/run.js\`, import.meta.url)
await import(bin.href).catch((error) => fail(\`version \${version} did not load (\${error.message})\`))
`

/** The version of the running copy. */
export function ownVersion(): string {
  return (
    JSON.parse(readFileSync(join(PACKAGE_DIR, 'package.json'), 'utf8')) as { version: string }
  ).version
}

/** The version `current.json` names, or `null`. */
export function currentVersion(home: string): string | null {
  try {
    return (
      (JSON.parse(readFileSync(join(home, 'current.json'), 'utf8')) as { version?: string })
        .version ?? null
    )
  } catch (_error) {
    // No install yet, or a file being replaced: nothing is current.
    return null
  }
}

/** Write a file by rename from a temporary file beside it, so a reader sees all of it or none. */
function writeAtomic(path: string, text: string): void {
  const temp = `${path}.${process.pid}.tmp`
  writeFileSync(temp, text)
  renameSync(temp, path)
}

/**
 * Start a server command, send `initialize`, and resolve with the version it answers.
 *
 * @param command - The executable.
 * @param args - Its arguments.
 * @param timeoutMs - How long to wait for the answer.
 * @returns The version and the milliseconds it took; rejects when the server exits or is silent.
 */
export function probeServer(
  command: string,
  args: string[],
  timeoutMs = 120_000,
): Promise<{ version: string; ms: number }> {
  const started = Date.now()
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'ignore'],
      env: { ...process.env, [NO_UPDATE_ENV]: '1' },
    })
    let buffer = ''
    let settled = false
    const finish = (error: Error | null, version?: string): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      child.kill()
      if (error) reject(error)
      else resolve({ version: version!, ms: Date.now() - started })
    }
    const timer = setTimeout(
      () => finish(new Error(`no answer within ${Math.round(timeoutMs / 1000)} s`)),
      timeoutMs,
    )
    child.on('error', (error) => finish(error))
    child.on('exit', (code) => finish(new Error(`exited with code ${code} before answering`)))
    child.stdout.on('data', (chunk: Buffer) => {
      buffer += String(chunk)
      for (let at = buffer.indexOf('\n'); at >= 0; at = buffer.indexOf('\n')) {
        const line = buffer.slice(0, at).trim()
        buffer = buffer.slice(at + 1)
        try {
          const message = JSON.parse(line) as {
            id?: unknown
            result?: { serverInfo?: { version?: unknown } }
          }
          const version = message.result?.serverInfo?.version
          if (message.id === 1 && typeof version === 'string') finish(null, version)
        } catch (_error) {
          // Not a JSON-RPC line: keep reading.
        }
      }
    })
    child.stdin.write(
      `${JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'molecule-mcp-install', version: '0' },
        },
      })}\n`,
    )
  })
}

/**
 * Make the running copy the current version of the machine install at `home`: it must answer
 * `initialize` first. Writes `run.mjs`, switches `current.json`, records the check time, and
 * removes every version but this one and the one it replaced.
 *
 * @param home - The machine install's directory (`~/.mlcl/mcp`).
 * @param self - This copy's version and how to start it (tests).
 * @param self.version - The version this copy is.
 * @param self.start - Starts it and resolves with its `initialize` answer.
 * @returns The version and how long it took to answer.
 */
export async function activate(
  home: string,
  {
    version = ownVersion(),
    start = () => probeServer(process.execPath, [join(PACKAGE_DIR, 'bin', 'run.js')]),
  }: { version?: string; start?: () => Promise<{ version: string; ms: number }> } = {},
): Promise<{ version: string; ms: number }> {
  const probe = await start()
  if (probe.version !== version)
    throw new Error(`the installed copy answered as ${probe.version}, not ${version}`)
  mkdirSync(home, { recursive: true })
  const previous = currentVersion(home)
  writeAtomic(join(home, 'run.mjs'), LAUNCHER)
  writeAtomic(join(home, 'current.json'), `${JSON.stringify({ version })}\n`)
  writeAtomic(join(home, 'checked'), `${new Date().toISOString()}\n`)
  const versions = join(home, 'versions')
  for (const entry of existsSync(versions) ? readdirSync(versions) : []) {
    if (entry === version || entry === previous) continue
    // A version being installed right now is left to the updater that owns it.
    if (
      /\.tmp-\d+$/.test(entry) &&
      Date.now() - statSync(join(versions, entry)).mtimeMs < STALE_LOCK_MS
    )
      continue
    rmSync(join(versions, entry), { recursive: true, force: true })
  }
  return probe
}

/**
 * Install one version of molecule-mcp into `<home>/versions/<version>`, unless it is there.
 *
 * @param home - The machine install's directory.
 * @param version - The exact version.
 * @param npm - Runs npm with these arguments in a directory (tests).
 * @returns The installed copy's `dist/machine-install-cli.js`.
 */
export function installVersion(
  home: string,
  version: string,
  npm: (args: string[], cwd: string) => void = (args, cwd) =>
    execFileSync('npm', args, { cwd, stdio: 'ignore', timeout: 600_000 }),
): string {
  const dir = join(home, 'versions', version)
  const cli = join(dir, 'node_modules', 'molecule-mcp', 'dist', 'machine-install-cli.js')
  if (existsSync(cli)) return cli
  const temp = `${dir}.tmp-${process.pid}`
  rmSync(temp, { recursive: true, force: true })
  mkdirSync(temp, { recursive: true })
  // A package.json of its own, so npm installs here and not into a project above it.
  writeFileSync(join(temp, 'package.json'), '{ "name": "molecule-mcp-version", "private": true }\n')
  try {
    npm(['install', '--no-audit', '--no-fund', `molecule-mcp@${version}`], temp)
    rmSync(dir, { recursive: true, force: true })
    renameSync(temp, dir)
  } finally {
    rmSync(temp, { recursive: true, force: true })
  }
  if (!existsSync(cli)) throw new Error(`molecule-mcp ${version} has no machine install`)
  return cli
}

/** What {@link update} needs from npm and the new copy, so tests run without a registry. */
export interface UpdateDeps {
  /** The registry's `latest` molecule-mcp; throws when the registry cannot be reached. */
  latest: () => string
  /** Install a version; returns its `dist/machine-install-cli.js` (see {@link installVersion}). */
  install: (home: string, version: string) => string
  /** Run that copy's `activate`; true when it exited 0. */
  activate: (cli: string, home: string) => boolean
}

const updateDeps: UpdateDeps = {
  latest: () =>
    execFileSync('npm', ['view', 'molecule-mcp', 'version'], {
      encoding: 'utf8',
      timeout: 60_000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim(),
  install: (home, version) => installVersion(home, version),
  activate: (cli, home) =>
    spawnSync(process.execPath, [cli, 'activate', home], { stdio: 'ignore', timeout: 180_000 })
      .status === 0,
}

/**
 * Check the registry for a newer molecule-mcp, install it beside the current one, and switch to
 * it once it answers `initialize`. One updater runs at a time (a `mkdir` lock).
 *
 * @param home - The machine install's directory.
 * @param deps - npm and the new copy's activation (tests).
 * @returns What happened: `current`, `updated <version>`, `busy`, `offline` or `failed <why>`.
 */
export async function update(home: string, deps: UpdateDeps = updateDeps): Promise<string> {
  const lock = join(home, 'update.lock')
  try {
    mkdirSync(lock)
  } catch (_error) {
    // Another updater holds the lock, unless it died long ago.
    let age = 0
    try {
      age = Date.now() - statSync(lock).mtimeMs
    } catch (_released) {
      // It finished a moment ago: today's check is done.
    }
    if (age < STALE_LOCK_MS) return 'busy'
    rmSync(lock, { recursive: true, force: true })
    try {
      mkdirSync(lock)
    } catch (_taken) {
      // A second updater took the stale lock first.
      return 'busy'
    }
  }
  try {
    writeAtomic(join(home, 'checked'), `${new Date().toISOString()}\n`)
    let latest: string
    try {
      latest = deps.latest()
    } catch (_error) {
      // No registry: keep the current version and try tomorrow.
      return 'offline'
    }
    if (!latest || latest === currentVersion(home)) return 'current'
    let cli: string
    try {
      cli = deps.install(home, latest)
    } catch (error) {
      return `failed ${error instanceof Error ? error.message : String(error)}`
    }
    if (!deps.activate(cli, home)) {
      rmSync(join(home, 'versions', latest), { recursive: true, force: true })
      return `failed ${latest} did not start`
    }
    return `updated ${latest}`
  } finally {
    rmSync(lock, { recursive: true, force: true })
  }
}

/** Start `machine-install-cli.js update <home>` detached, its output discarded. */
const launchUpdate = (home: string): void => {
  const child = spawn(
    process.execPath,
    [join(PACKAGE_DIR, 'dist', 'machine-install-cli.js'), 'update', home],
    { detached: true, stdio: 'ignore' },
  )
  child.on('error', () => undefined)
  child.unref()
}

/**
 * After the server has connected: when it was started from the machine install and the last
 * check is a day old, check for a newer version in a detached child, off the start path.
 *
 * @param env - The process environment.
 * @param now - The current time (tests).
 * @param launch - Starts the check (tests).
 * @returns Whether a check was started.
 */
export function startBackgroundUpdate(
  env: Record<string, string | undefined> = process.env,
  now = Date.now(),
  launch: (home: string) => void = launchUpdate,
): boolean {
  const home = env[MACHINE_HOME_ENV]
  if (!home || env[NO_UPDATE_ENV] === '1') return false
  try {
    if (now - statSync(join(home, 'checked')).mtimeMs < UPDATE_INTERVAL_MS) return false
  } catch (_error) {
    // Never checked: check now.
  }
  launch(home)
  return true
}
