/**
 * Where `npm install` has to run for a project directory.
 *
 * A full-stack project is an npm workspace: the root `package.json` lists `api` and `app` and
 * holds the shared dev tools (husky, prettier, eslint). Run inside `api/`, `npm install` installs
 * that workspace's dependencies only, but still runs the ROOT's `prepare` script, so after
 * `mlcl create --skip-install` it failed with `sh: husky: not found` (exit 127) and every
 * `mlcl add` / `swap` / `inject` that installs exited 1 with its package already written
 * (2026-11-22 smoke test, Codex: `cd api && mlcl add @molecule/api-resource-user --inject`).
 * Installing from the workspace root installs the whole tree, the root's tools included.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, sep } from 'node:path'

/**
 * Whether a `workspaces` entry (a path, or a glob with `*` segments) names `rel`.
 *
 * @param pattern - One `workspaces` entry, e.g. `api` or `packages/*`.
 * @param rel - The member's path relative to the root, with `/` separators.
 * @returns True when the entry covers that path.
 */
function workspaceMatches(pattern: string, rel: string): boolean {
  const clean = pattern.replace(/^\.\//, '').replace(/\/+$/, '')
  const source = clean
    .split('/')
    .map((segment) =>
      segment === '**'
        ? '.*'
        : segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*'),
    )
    .join('/')
  return new RegExp(`^${source}$`).test(rel)
}

/**
 * The npm workspace root that `dir` belongs to, or `dir` itself when it is not a workspace member.
 *
 * Walks up from `dir` the way npm does and returns the first ancestor whose `package.json`
 * lists `dir` in its `workspaces` (array or `{ packages }` form).
 *
 * @param dir - The project or workspace directory a command installs into.
 * @returns The directory to run `npm install` in.
 */
export function npmInstallRoot(dir: string): string {
  for (let root = dirname(dir); ; root = dirname(root)) {
    const manifest = join(root, 'package.json')
    if (existsSync(manifest)) {
      let workspaces: unknown
      try {
        workspaces = JSON.parse(readFileSync(manifest, 'utf8')).workspaces
      } catch (_error) {
        // An unreadable package.json declares no workspaces; npm would not treat it as a root either.
        workspaces = undefined
      }
      const list = Array.isArray(workspaces)
        ? workspaces
        : Array.isArray((workspaces as { packages?: unknown } | undefined)?.packages)
          ? (workspaces as { packages: unknown[] }).packages
          : []
      const rel = relative(root, dir).split(sep).join('/')
      if (list.some((entry) => typeof entry === 'string' && workspaceMatches(entry, rel)))
        return root
    }
    if (dirname(root) === root) return dir
  }
}
