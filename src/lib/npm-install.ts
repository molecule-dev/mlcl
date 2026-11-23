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

/** How one install runs. */
export interface NpmInstallOptions {
  /**
   * Use cached package metadata without asking the registry again: for an install seconds after
   * one that filled the cache, which then fetches only what it has not seen.
   */
  preferOffline?: boolean
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
 * @param cwd - Where npm runs: the project, or its npm workspace root (`npmInstallRoot`).
 * @param options - How the install runs.
 */
export async function npmInstall(cwd: string, options: NpmInstallOptions = {}): Promise<void> {
  await execa('npm', npmInstallArgs(options), { cwd, stdio: 'pipe' })
}
