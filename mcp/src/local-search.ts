/**
 * `search_packages` for the stdio server, run in this process over the registry file of the CLI
 * the server runs.
 *
 * The tool used to spawn `mlcl search --json`: about 0.8 s of CLI start-up at a load average of 19
 * for a search that takes about 40 ms in process (2026-11-23). A coding agent searches several
 * times per task, and every search waited for that start-up.
 *
 * The answer must stay the CLI's: the same registry file, the same ranking and the same JSON. So
 * this reads the `registry.json` inside the resolved `mlcl` package (or `MLCL_REGISTRY_PATH`, which
 * that CLI honours too), ranks with the generated copy of the CLI's own search module, and reads
 * the framework from the same project manifests. When the command is not an `mlcl` package (a
 * wrapper script on `MOLECULE_MCP_CLI`, or the per-call npx form on Windows), the tool spawns the
 * CLI as before.
 *
 * @module
 */
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'

import type { CliCommand } from './cli-command.js'
import {
  type AppFrameworkInstalls,
  declaredFramework,
  searchPackages,
  searchResultsJson,
  type SearchSourceEntry,
  unknownFrameworkMessage,
} from './package-search.js'

/** What the lookup reads from its environment; injectable for tests. */
export interface CliRegistryDeps {
  /** The process environment (`MLCL_REGISTRY_PATH`). */
  env: NodeJS.ProcessEnv
  /** The real path of a file, following symlinks (npx and npm link the CLI's bin). */
  realpath: (file: string) => string
  /** True when `file` exists. */
  exists: (file: string) => boolean
  /** A file's text. */
  readFile: (file: string) => string
}

const defaultDeps: CliRegistryDeps = {
  env: process.env,
  realpath: realpathSync,
  exists: existsSync,
  readFile: (file) => readFileSync(file, 'utf8'),
}

/** How far above the CLI's bin file its package root may be (`bin/run.js` is one level down). */
const MAX_PACKAGE_DEPTH = 3

/**
 * The registry file a resolved CLI command reads.
 *
 * @param cli - The command the server runs; `file` must be the CLI's own bin (an absolute path,
 *   or a name on PATH already resolved to one in `path`).
 * @param deps - The environment to read.
 * @returns The registry path, or undefined when the command is not an `mlcl` package's bin.
 */
export function cliRegistryPath(
  cli: CliCommand,
  deps: CliRegistryDeps = defaultDeps,
): string | undefined {
  // The per-call npx form names a spec, not a file.
  const bin = cli.prefix.length === 0 ? (cli.path ?? cli.file) : undefined
  if (!bin || !deps.exists(bin)) return undefined
  let dir: string
  try {
    dir = dirname(deps.realpath(bin))
  } catch (_error) {
    return undefined
  }
  for (let depth = 0; depth < MAX_PACKAGE_DEPTH; depth += 1, dir = dirname(dir)) {
    const manifest = join(dir, 'package.json')
    if (!deps.exists(manifest)) continue
    // The nearest manifest decides: a wrapper script inside some other package is not the CLI.
    let name: unknown
    try {
      name = (JSON.parse(deps.readFile(manifest)) as { name?: unknown }).name
    } catch (_error) {
      return undefined
    }
    if (name !== 'mlcl') return undefined
    const registry = deps.env.MLCL_REGISTRY_PATH ?? join(dir, 'registry.json')
    return deps.exists(registry) ? registry : undefined
  }
  return undefined
}

/** The search inputs the tool accepts. */
export interface LocalSearchInput {
  query: string
  stack?: 'api' | 'app'
  framework?: string
  limit?: number
}

/**
 * Run a search over a registry file, as `mlcl search <query> --json` run in `cwd` prints it.
 *
 * @param registryFile - The CLI's registry file ({@link cliRegistryPath}).
 * @param input - The tool's arguments.
 * @param cwd - The directory whose project manifests declare the default framework.
 * @param deps - The environment to read.
 * @returns The JSON text of the hits.
 * @throws When the framework is not one the registry lists, with the CLI's message.
 */
export function searchLocalRegistry(
  registryFile: string,
  input: LocalSearchInput,
  cwd: string,
  deps: Pick<CliRegistryDeps, 'exists' | 'readFile'> = defaultDeps,
): string {
  const registry = JSON.parse(deps.readFile(registryFile)) as {
    packages?: Record<string, Omit<SearchSourceEntry, 'name'>>
    appFrameworks?: Record<string, AppFrameworkInstalls>
  }
  const appFrameworks = registry.appFrameworks ?? {}
  const unknown = input.framework && unknownFrameworkMessage(input.framework, appFrameworks)
  if (unknown) throw new Error(unknown)
  const framework =
    input.framework ??
    declaredFramework((manifest) => {
      const file = join(cwd, manifest)
      return deps.exists(file) ? deps.readFile(file) : undefined
    })
  const entries = Object.entries(registry.packages ?? {}).map(
    ([name, entry]): SearchSourceEntry => ({ ...entry, name }),
  )
  return searchResultsJson(
    searchPackages(entries, input.query, {
      stack: input.stack,
      framework,
      appFrameworks,
      limit: input.limit,
    }),
  )
}
