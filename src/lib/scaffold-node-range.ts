import { readFile } from 'node:fs/promises'
import { join, relative, resolve, sep } from 'node:path'

import { z } from 'zod'

import { isExactVersion } from './exact-version.js'
import { intersectNodeEngineRanges } from './node-engine-intersection.js'
import { getRawRegistry } from './registry.js'

const strings = z.record(z.string(), z.string()).default({})
const manifestShape = z.object({
  dependencies: strings,
  devDependencies: strings,
  engines: strings,
  scripts: strings,
  workspaces: z.array(z.string()).default([]),
})
const manifestObject = z.record(z.string(), z.unknown())

interface ScaffoldManifest {
  path: string
  raw: Record<string, unknown>
  manifest: z.infer<typeof manifestShape>
}

async function readManifest(path: string): Promise<ScaffoldManifest> {
  const contents = await readFile(path, 'utf8')
  const raw = manifestObject.parse(JSON.parse(contents))
  return { path, raw, manifest: manifestShape.parse(raw) }
}

/**
 * Plan the Node range of the actual generated manifests. The root includes its
 * workspace requirements and the CLI it uses for setup and checks.
 *
 * @param projectRoot - The directory produced by mlcl create.
 * @returns Manifest writes for the root and every workspace whose Node range changed.
 */
export async function scaffoldNodeEngineManifests(
  projectRoot: string,
): Promise<{ path: string; contents: string }[]> {
  const root = await readManifest(join(projectRoot, 'package.json'))
  const cli = await readManifest(join(import.meta.dirname, '..', '..', 'package.json'))
  const pins = getRawRegistry().toolchainEngines?.pins ?? {}
  const members = await Promise.all(
    root.manifest.workspaces.map((workspace) => {
      const path = resolve(projectRoot, workspace)
      const inside = relative(projectRoot, path)
      if (!inside || inside === '..' || inside.startsWith('..' + sep))
        throw new Error('Invalid generated workspace path: ' + workspace)
      return readManifest(join(path, 'package.json'))
    }),
  )

  function requirements(entry: ScaffoldManifest, usesCli: boolean): Map<string, string> {
    const result = new Map<string, string>()
    if (usesCli && cli.manifest.engines.node) result.set('mlcl', cli.manifest.engines.node)
    for (const declarations of [entry.manifest.dependencies, entry.manifest.devDependencies]) {
      for (const [name, version] of Object.entries(declarations)) {
        if (!isExactVersion(version)) continue
        const pin = name + '@' + version
        const range = pins[pin]
        if (range) result.set(pin, range)
      }
    }
    return result
  }

  const rootRequirements = requirements(root, true)
  const planned = members.map((entry) => {
    const memberRequirements = requirements(
      entry,
      Object.hasOwn(entry.manifest.dependencies, 'mlcl') ||
        Object.hasOwn(entry.manifest.devDependencies, 'mlcl') ||
        Object.values(entry.manifest.scripts).some((command) =>
          /(?:^|\s)mlcl(?:\s|$)/.test(command),
        ),
    )
    for (const [name, range] of memberRequirements) rootRequirements.set(name, range)
    return { entry, node: intersectNodeEngineRanges(memberRequirements) }
  })
  planned.push({ entry: root, node: intersectNodeEngineRanges(rootRequirements) })

  return planned
    .filter(({ entry, node }) => entry.manifest.engines.node !== node)
    .map(({ entry, node }) => ({
      path: entry.path,
      contents:
        JSON.stringify({ ...entry.raw, engines: { ...entry.manifest.engines, node } }, null, 2) +
        '\n',
    }))
}
