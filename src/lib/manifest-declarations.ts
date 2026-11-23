/**
 * What a project's manifests declare, so a step that runs after `npm install` can tell whether it
 * declared a package that install never saw.
 *
 * @module
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

/** The manifests a scaffold writes: the root, and the api and app workspaces of a full-stack one. */
const MANIFESTS = ['package.json', join('api', 'package.json'), join('app', 'package.json')]

/** The sections npm installs. */
const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies'] as const

/**
 * Every dependency the project's manifests declare, one `<manifest> <name>@<spec>` entry each.
 * The section is left out: a package moved between sections needs no install. A manifest that
 * is missing or unreadable declares nothing.
 *
 * @param projectPath - The project root.
 * @returns The declarations.
 */
export async function declaredDependencies(projectPath: string): Promise<Set<string>> {
  const declared = new Set<string>()
  for (const rel of MANIFESTS) {
    let manifest: Partial<Record<(typeof SECTIONS)[number], Record<string, string>>>
    try {
      manifest = JSON.parse(await readFile(join(projectPath, rel), 'utf-8')) as typeof manifest
    } catch (_error) {
      // Missing (an app-only project has no api/) or unreadable: create reports a broken manifest
      // where it reads it, and a manifest npm cannot read gave the install nothing to see either.
      continue
    }
    for (const section of SECTIONS)
      for (const [name, spec] of Object.entries(manifest[section] ?? {}))
        declared.add(`${rel} ${name}@${spec}`)
  }
  return declared
}

/**
 * The declarations in `after` that `before` lacks.
 *
 * @param before - Declarations read earlier.
 * @param after - Declarations read now.
 * @returns The new ones, sorted.
 */
export function newDeclarations(before: ReadonlySet<string>, after: ReadonlySet<string>): string[] {
  return [...after].filter((entry) => !before.has(entry)).sort()
}
