/**
 * Install the MCP server for the whole machine, in `~/.mlcl/mcp/`, so `mlcl setup` can register
 * `node ~/.mlcl/mcp/run.mjs` instead of `npx -y molecule-mcp` (why: `machineMcpHome` and
 * `mcpServerCommand` in agent-harnesses.ts, and mcp/src/machine-install.ts, which owns the layout).
 *
 * Setup installs the registry's `latest` molecule-mcp into `versions/<version>`, then runs that
 * copy's `machine-install-cli.js activate`, which starts it, checks it answers `initialize`, and
 * only then makes it current. Later updates are the server's own (once a day, in the background).
 *
 * @module
 */

import { execFile } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { type AgentEnvironment, LEGACY_MCP_COMMAND, machineMcpHome } from './agent-harnesses.js'
import { npmInstallPackage } from './npm-install.js'

const run = promisify(execFile)

/** What {@link prepareMachineMcp} did. */
export type MachineMcpResult =
  /** A new version was installed and answered. */
  | { status: 'installed'; version: string; ms: number }
  /** The installed version is the registry's latest. */
  | { status: 'current'; version: string }
  /** A newer version could not be installed or checked; the installed one stays. */
  | { status: 'kept'; version: string; detail: string }
  /** Nothing is installed and nothing could be: the agents need another command. */
  | { status: 'failed'; detail: string }

/** What the install needs from the outside world, so tests run without npm or a registry. */
export interface MachineMcpDeps {
  /** The registry's `latest` molecule-mcp. */
  latest: () => Promise<string>
  /** Install `molecule-mcp@<version>` into a directory holding only a package.json. */
  install: (dir: string, version: string) => Promise<void>
  /** Run the installed copy's activation; resolves with its JSON line. */
  activate: (cli: string, home: string) => Promise<string>
}

const defaultDeps: MachineMcpDeps = {
  latest: async () =>
    (await run('npm', ['view', 'molecule-mcp', 'version'], { timeout: 60_000 })).stdout.trim(),
  install: (dir, version) => npmInstallPackage(dir, `molecule-mcp@${version}`),
  activate: async (cli, home) =>
    (await run(process.execPath, [cli, 'activate', home], { timeout: 180_000 })).stdout,
}

const message = (error: unknown): string =>
  (error instanceof Error ? error.message : String(error)).split('\n')[0]

/**
 * The version the machine install starts, when its launcher and that version are both there.
 *
 * @param mcpHome - `~/.mlcl/mcp`.
 * @returns The version, or null.
 */
export function installedMachineMcp(mcpHome: string): string | null {
  try {
    const { version } = JSON.parse(readFileSync(join(mcpHome, 'current.json'), 'utf8')) as {
      version?: string
    }
    const bin = join(mcpHome, 'versions', version ?? '', 'node_modules', 'molecule-mcp', 'bin')
    return version && existsSync(join(mcpHome, 'run.mjs')) && existsSync(join(bin, 'run.js'))
      ? version
      : null
  } catch (_error) {
    // No current.json: nothing is installed.
    return null
  }
}

/**
 * Make sure `<home>/.mlcl/mcp` starts the registry's latest molecule-mcp.
 *
 * @param home - The user's home directory.
 * @param deps - The registry, npm and activation (tests).
 * @returns What happened. On `failed`, the agents should start the server another way.
 */
export async function prepareMachineMcp(
  home: string,
  deps: MachineMcpDeps = defaultDeps,
): Promise<MachineMcpResult> {
  const mcpHome = machineMcpHome(home)
  const installed = installedMachineMcp(mcpHome)
  const keepOrFail = (detail: string): MachineMcpResult =>
    installed ? { status: 'kept', version: installed, detail } : { status: 'failed', detail }

  let latest: string
  try {
    latest = await deps.latest()
  } catch (error) {
    return keepOrFail(`could not ask the registry for molecule-mcp (${message(error)})`)
  }
  if (!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(latest))
    return keepOrFail(`the registry answered "${latest}" for molecule-mcp's version`)
  if (installed === latest) return { status: 'current', version: latest }

  const versions = join(mcpHome, 'versions')
  const dir = join(versions, latest)
  const cli = join(dir, 'node_modules', 'molecule-mcp', 'dist', 'machine-install-cli.js')
  if (!existsSync(cli)) {
    const temp = `${dir}.tmp-${process.pid}`
    rmSync(temp, { recursive: true, force: true })
    mkdirSync(temp, { recursive: true })
    writeFileSync(
      join(temp, 'package.json'),
      '{ "name": "molecule-mcp-version", "private": true }\n',
    )
    try {
      await deps.install(temp, latest)
      rmSync(dir, { recursive: true, force: true })
      renameSync(temp, dir)
    } catch (error) {
      return keepOrFail(`npm could not install molecule-mcp@${latest} (${message(error)})`)
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
    if (!existsSync(cli)) {
      rmSync(dir, { recursive: true, force: true })
      return keepOrFail(`molecule-mcp@${latest} cannot be installed for the whole machine`)
    }
  }
  try {
    const answer = JSON.parse((await deps.activate(cli, mcpHome)).trim()) as {
      version: string
      ms: number
    }
    return { status: 'installed', version: answer.version, ms: answer.ms }
  } catch (error) {
    rmSync(dir, { recursive: true, force: true })
    return keepOrFail(`molecule-mcp@${latest} did not start (${message(error)})`)
  }
}

/**
 * Prepare the machine install for the agents about to be registered, and say in one line what
 * happened. When nothing can be installed, `env.machineMcpCommand` becomes `npx -y molecule-mcp`,
 * so every machine-scope target registers a command that still starts the server.
 *
 * @param env - The environment setup plans with; changed on failure.
 * @param deps - The registry, npm and activation (tests).
 * @returns Whether the installed launcher is what the agents get, and the line to print.
 */
export async function useMachineMcp(
  env: AgentEnvironment,
  deps: MachineMcpDeps = defaultDeps,
): Promise<{ ok: boolean; line: string }> {
  const result = await prepareMachineMcp(env.home, deps)
  switch (result.status) {
    case 'installed':
      return {
        ok: true,
        line: `molecule-mcp ${result.version} installed in ~/.mlcl/mcp (starts in ${(result.ms / 1000).toFixed(1)} s)`,
      }
    case 'current':
      return { ok: true, line: `molecule-mcp ${result.version} in ~/.mlcl/mcp is the latest` }
    case 'kept':
      return {
        ok: true,
        line: `molecule-mcp ${result.version} in ~/.mlcl/mcp stays: ${result.detail}`,
      }
    case 'failed':
      env.machineMcpCommand = [...LEGACY_MCP_COMMAND]
      return {
        ok: false,
        line: `${result.detail}; the agents start the server through npx -y molecule-mcp instead`,
      }
  }
}
