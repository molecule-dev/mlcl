/**
 * The libraries a replaced provider brought into the app, removed by `mlcl swap` once nothing uses them.
 *
 * `mlcl inject` declares a package's own third-party dependencies in the app (`connect-busboy` for
 * the Express body parser, `pg` for PostgreSQL), and the migration runner it renders imports some
 * of them itself. `mlcl swap` replaced the provider's pin but kept those, so a swapped app went on
 * declaring and installing the old vendor's driver. A library is removed only when the old
 * provider's installed copy depended on it, and none of these still needs it: a source file or
 * script of the app, another declared `@molecule/*` package, or the new provider.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'

import { getRawRegistry } from './registry.js'

/** The source files an import of a library can sit in. */
const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.mts',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.vue',
  '.svelte',
])
/** Directories that hold no app source. */
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git'])

type Manifest = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  scripts?: Record<string, string>
}

/** The installed copy's own `dependencies`, found the way Node resolves it from `dir`. */
function installedDependencies(dir: string, name: string): Record<string, string> | undefined {
  for (let at = dir; ; at = dirname(at)) {
    const manifest = join(at, 'node_modules', name, 'package.json')
    if (existsSync(manifest))
      return (JSON.parse(readFileSync(manifest, 'utf8')) as Manifest).dependencies ?? {}
    if (dirname(at) === at) return undefined
  }
}

/** Every source file under `dir`, app code only. */
function sourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...sourceFiles(join(dir, entry.name)))
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(join(dir, entry.name))
  }
  return files
}

/** `name` escaped for a regular expression. */
const literal = (name: string): string => name.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')

/** Whether a script runs `name` or its binary as a word of the command (`prisma generate`). */
function runs(scripts: string, name: string): boolean {
  return new RegExp(`(?:^|[\\s/'"=])${literal(name)}(?:$|[\\s@/'"])`, 'm').test(scripts)
}

/** Whether `source` imports `name` or a subpath of it (static, dynamic, require or side-effect). */
function imports(source: string, name: string): boolean {
  const quoted = literal(name)
  return new RegExp(
    `(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\brequire\\s*\\(\\s*|\\bimport\\s+)['"]${quoted}(?:/[^'"]*)?['"]`,
  ).test(source)
}

/**
 * Remove from the app's manifest the libraries only the replaced provider used.
 *
 * @param projectPath - The workspace whose package.json the swap rewrote.
 * @param oldName - The replaced provider (still installed: the swap's install has not run yet).
 * @param newName - The provider that replaced it.
 * @returns The names removed; empty when the old provider is not installed here.
 */
export function dropReplacedProviderDependencies(
  projectPath: string,
  oldName: string,
  newName: string,
): string[] {
  const own = installedDependencies(projectPath, oldName)
  if (!own) return []
  const manifestPath = join(projectPath, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as Manifest
  const declared = { ...manifest.dependencies, ...manifest.devDependencies }
  const candidates = Object.keys(own).filter(
    (name) => !name.startsWith('@molecule/') && name in declared,
  )
  if (candidates.length === 0) return []

  const registry = getRawRegistry().packages
  const stillNeeded = new Set<string>(registry[newName]?.runtimeDependencies ?? [])
  // Every declared package counts, the replaced provider too: the swap keeps its pin when a
  // package the app keeps still requires it, and then it stays installed with its libraries.
  for (const name of Object.keys(declared)) {
    if (!name.startsWith('@molecule/')) continue
    for (const dep of Object.keys(installedDependencies(projectPath, name) ?? {}))
      stillNeeded.add(dep)
    for (const dep of registry[name]?.runtimeDependencies ?? []) stillNeeded.add(dep)
  }
  const scripts = Object.values(manifest.scripts ?? {}).join('\n')
  const sources = sourceFiles(projectPath).map((file) => readFileSync(file, 'utf8'))
  const dropped = candidates.filter(
    (name) =>
      !stillNeeded.has(name) &&
      !runs(scripts, name) &&
      !sources.some((source) => imports(source, name)),
  )
  if (dropped.length === 0) return []
  for (const name of dropped) {
    delete manifest.dependencies?.[name]
    delete manifest.devDependencies?.[name]
  }
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  return dropped
}
