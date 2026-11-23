/**
 * Which `mlcl` the server runs for its CLI-backed tools.
 *
 * Every documented install line starts this server without installing the CLI:
 * `npx -y molecule-mcp` (the one-line `claude mcp add` / `codex mcp add` entries),
 * the entry `mlcl setup` writes, and the Claude Code plugin's `.mcp.json`. On a
 * machine with no global `mlcl`, every CLI-backed tool (`search_packages`,
 * `list_templates`, `scaffold_project`, `add_package`, …) answered "not found",
 * and an agent that meets that error writes the feature by hand instead
 * (2026-11-21: both tools failed this way in a fresh home).
 *
 * The order is: `$MOLECULE_MCP_CLI` (an explicit override), an `mlcl` on PATH (a
 * global install), then the published CLI through npx, the same way this server
 * was started. The npx step asks npx once for the cached binary's path (`npx
 * --yes --package mlcl -c "command -v mlcl"`): later calls run that file
 * directly, so they cost no registry round trip, and npx keeps a single cache
 * entry because the spec string never changes. {@link warmCli} starts that step
 * when the server starts, so the download (about 25 s, once per machine) happens
 * while the agent is still reading the tool list rather than inside a tool call
 * that a client may time out. Where the shell probe cannot run (Windows), each
 * call goes through `npx --yes mlcl` instead.
 *
 * @module
 */
import { existsSync } from 'node:fs'
import { posix, win32 } from 'node:path'

import { execa } from 'execa'

/** A program and the arguments that come before the CLI's own argv. */
export interface CliCommand {
  /** The program to spawn. */
  file: string
  /** Arguments placed before the CLI argv (`['--yes', 'mlcl']` for npx). */
  prefix: string[]
  /** Where the command came from, for messages. */
  source: 'override' | 'path' | 'npx'
  /** The file a bare `file` name resolves to on PATH (`source: 'path'`). */
  path?: string
}

/**
 * How long one CLI call may run before the server stops it (`MOLECULE_MCP_CLI_TIMEOUT_MS`
 * overrides). `mlcl setup` sets Codex's tool limit above this (`CODEX_MCP_TIMEOUT_LINES`).
 */
export const CLI_TIMEOUT_DEFAULT_MS = 10 * 60_000

/**
 * The npm spec the npx step installs: `mlcl`, spelled exactly as `npx mlcl setup` and every skill
 * spell it. npx keys its cache by the spec string, so `mlcl@latest` was a second full download of
 * the CLI beside the agent's `npx mlcl` (harness eval `find`, 2026-11-23). The bare spec still
 * moves to a new release: npx installs the current `latest` into the same cache entry.
 */
export const MLCL_NPX_SPEC = 'mlcl'

/** What the resolver reads from its environment; injectable for tests. */
export interface CliResolverDeps {
  /** The process environment (`MOLECULE_MCP_CLI`, `PATH`). */
  env: NodeJS.ProcessEnv
  /** The platform, which decides whether the shell probe can run. */
  platform: NodeJS.Platform
  /** True when `file` exists. */
  exists: (file: string) => boolean
  /**
   * Run a command to completion.
   *
   * @returns Its stdout, or null when it could not start or exited non-zero.
   */
  run: (file: string, args: string[]) => Promise<string | null>
}

const defaultDeps: CliResolverDeps = {
  env: process.env,
  platform: process.platform,
  exists: existsSync,
  run: async (file, args) => {
    const result = await execa(file, args, { reject: false, stdin: 'ignore', timeout: 10 * 60_000 })
    return result.failed ? null : result.stdout
  },
}

/**
 * The first executable named `name` in the PATH directories.
 *
 * @param name - The program name.
 * @param deps - The environment to read.
 * @returns Its path, or undefined when no PATH entry holds it.
 */
function findOnPath(name: string, deps: CliResolverDeps): string | undefined {
  const windows = deps.platform === 'win32'
  const { delimiter, join } = windows ? win32 : posix
  const names = windows ? [`${name}.cmd`, `${name}.exe`, name] : [name]
  // Windows spells the variable `Path`; Node's process.env reads it case-insensitively, a plain object does not.
  for (const dir of (deps.env.PATH ?? deps.env.Path ?? '').split(delimiter).filter(Boolean))
    for (const candidate of names)
      if (deps.exists(join(dir, candidate))) return join(dir, candidate)
  return undefined
}

/**
 * Create the resolver the server uses. The answer is computed once per process.
 *
 * @param deps - The environment to read; the real process by default.
 * @returns `command()` resolves the CLI to run; `warm()` starts that work early; `forget()`
 *   drops the answer, so the next `command()` resolves again.
 */
export function createCliResolver(deps: CliResolverDeps = defaultDeps): {
  command: () => Promise<CliCommand>
  warm: () => void
  forget: () => void
} {
  let pending: Promise<CliCommand> | null = null
  const resolve = async (): Promise<CliCommand> => {
    const override = deps.env.MOLECULE_MCP_CLI
    if (override) return { file: override, prefix: [], source: 'override' }
    const global = findOnPath('mlcl', deps)
    if (global) return { file: 'mlcl', prefix: [], source: 'path', path: global }
    const perCall: CliCommand = { file: 'npx', prefix: ['--yes', MLCL_NPX_SPEC], source: 'npx' }
    if (deps.platform === 'win32') return perCall
    const probed = await deps.run('npx', [
      '--yes',
      '--package',
      MLCL_NPX_SPEC,
      '-c',
      'command -v mlcl',
    ])
    const path = probed?.trim().split('\n').pop()?.trim()
    return path && deps.exists(path) ? { file: path, prefix: [], source: 'npx' } : perCall
  }
  const command = (): Promise<CliCommand> => (pending ??= resolve())
  return {
    command,
    warm: () => {
      // The result is kept for the first tool call; a failure here surfaces there.
      command().catch(() => undefined)
    },
    forget: () => {
      pending = null
    },
  }
}

const resolver = createCliResolver()

/**
 * The CLI this server runs, resolved once per process.
 *
 * @returns The program and its leading arguments.
 */
export const cliCommand = resolver.command

/** Start resolving (and, through npx, downloading) the CLI before the first tool call. */
export const warmCli = resolver.warm

/** Resolve again on the next call: the npx cache entry resolved earlier is gone. */
export const forgetCli = resolver.forget
