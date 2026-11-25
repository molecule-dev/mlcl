/**
 * The `@molecule/*` dependencies a project half declares and never uses.
 *
 * A dependency is used when a file of the half (or of the project's shared `e2e/`) names it, in an
 * import, a CSS `@import` or `@source`, a Vite option or a JSON config, or when it is a required
 * peer or runtime dependency (registry `moleculePeers`, `runtimeDependencies`) of a used one,
 * transitively. The registry is the peer source, so the check needs no molecule checkout.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** The registry fields this check reads. */
interface RegistryEntry {
  moleculePeers?: string[]
  runtimeDependencies?: string[]
}

const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git'])
const SCANNED = /\.(m?[jt]sx?|vue|svelte|html|css|json)$/
const MANIFESTS = new Set(['package.json', 'package-lock.json'])
const NAME = /@molecule\/[a-z0-9-]+/g

/**
 * The `@molecule/*` names a directory's files mention.
 *
 * @param dir - The directory.
 * @param into - The set to add them to.
 */
function namedIn(dir: string, into: Set<string>): void {
  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) namedIn(path, into)
    else if (SCANNED.test(entry) && !MANIFESTS.has(entry))
      for (const match of readFileSync(path, 'utf8').matchAll(NAME)) into.add(match[0])
  }
}

/**
 * The `@molecule/*` dependencies of `halfDir` that nothing uses.
 *
 * @param halfDir - The project half (`<project>/api` or `<project>/app`), with its package.json.
 * @param registry - The registry's packages by name.
 * @returns The unused names, in declaration order.
 */
export function unusedMoleculeDependencies(
  halfDir: string,
  registry: Record<string, RegistryEntry>,
): string[] {
  const manifest = JSON.parse(readFileSync(join(halfDir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  const declared = Object.keys(manifest.dependencies ?? {}).filter((name) =>
    name.startsWith('@molecule/'),
  )
  const named = new Set<string>()
  namedIn(halfDir, named)
  const shared = join(halfDir, '..', 'e2e')
  if (existsSync(shared)) namedIn(shared, named)

  const used = new Set(declared.filter((name) => named.has(name)))
  const queue = [...used]
  while (queue.length > 0) {
    const entry = registry[queue.pop() as string]
    for (const peer of [...(entry?.moleculePeers ?? []), ...(entry?.runtimeDependencies ?? [])])
      if (declared.includes(peer) && !used.has(peer)) {
        used.add(peer)
        queue.push(peer)
      }
  }
  return declared.filter((name) => !used.has(name))
}
