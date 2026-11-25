/**
 * `npm install` the way every mlcl command runs it.
 *
 * mlcl captures npm's output and prints only whether the install worked, so npm's audit report
 * and funding notice reach nobody. The audit still cost the most of any install phase: it runs
 * beside the download, resolves each advisory's dependents through full packuments, and
 * finishes last. A cold `mlcl create` waited 12.6 s of its 47 s install for it (npm's timing log,
 * 2026-11-23). A project keeps its own `npm audit`: the scaffold's security workflow runs it.
 *
 * @module
 */

import { execa } from 'execa'

import { lockedWithScripts, writeInstallScriptEntries } from './install-scripts.js'

/** How one install runs. */
export interface NpmInstallOptions {
  /**
   * Use cached package metadata without asking the registry again: for an install seconds after
   * one that filled the cache, which then fetches only what it has not seen.
   */
  preferOffline?: boolean
  /**
   * The project's whole tree is mlcl's to decide: one it just created. Without it, only the
   * packages this install adds get an `allowScripts` decision.
   */
  wholeTree?: boolean
}

/**
 * The arguments mlcl passes to `npm`.
 *
 * @param options - How the install runs.
 * @returns `install` and its flags.
 */
export function npmInstallArgs({ preferOffline = false }: NpmInstallOptions = {}): string[] {
  return ['install', '--no-audit', '--no-fund', ...(preferOffline ? ['--prefer-offline'] : [])]
}

/**
 * Run `npm install` in a directory, with npm's output captured.
 *
 * In a project mlcl just created (`wholeTree`), the packages of the lock that have an install
 * script get the registry's decision in `allowScripts` first (`install-scripts.ts`), so npm
 * neither warns about them nor skips one that must run. The install's own lock then names what it
 * added; their decisions are written after it, and an approved script it skipped runs through
 * `npm rebuild`. In any other project only those added packages get one.
 *
 * @param cwd - Where npm runs: the project, or its npm workspace root (`npmInstallRoot`).
 * @param options - How the install runs.
 */
export async function npmInstall(cwd: string, options: NpmInstallOptions = {}): Promise<void> {
  await npmInstallWithDecisions(cwd, npmInstallArgs(options), options.wholeTree === true)
}

/**
 * Install one package spec into a directory that holds nothing else, as `mlcl setup` installs
 * the MCP server for the whole machine (`mcp-machine-install.ts`).
 *
 * @param cwd - The directory; it needs a package.json of its own, or npm installs into the
 *   nearest project above it.
 * @param spec - The package and its exact version (`molecule-mcp@0.3.6`).
 */
export async function npmInstallPackage(cwd: string, spec: string): Promise<void> {
  await npmInstallWithDecisions(cwd, [...npmInstallArgs(), spec], true)
}

async function npmInstallWithDecisions(
  cwd: string,
  args: string[],
  wholeTree: boolean,
): Promise<void> {
  const except = wholeTree ? undefined : lockedWithScripts(cwd)
  if (wholeTree) writeInstallScriptEntries(cwd)
  await execa('npm', args, { cwd, stdio: 'pipe' })
  const { skipped } = writeInstallScriptEntries(cwd, { except })
  if (skipped.length) await execa('npm', ['rebuild', ...skipped], { cwd, stdio: 'pipe' })
}
