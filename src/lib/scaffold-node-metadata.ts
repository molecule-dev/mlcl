import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { z } from 'zod'

import { isExactVersion } from './exact-version.js'
import { npmRegistryUrl } from './package-doc-files.js'
import { resolveMoleculeVersion } from './package-upgrades.js'
import type { Registry } from './schema.js'

const nodeMetadata = z.object({
  version: z.string().optional(),
  engines: z.object({ node: z.string().optional() }).optional(),
})
const exactMetadata = nodeMetadata.extend({ name: z.string(), version: z.string() })
const lockShape = z.object({ packages: z.record(z.string(), nodeMetadata) })
const dependencies = z.record(z.string(), z.string()).default({})
const manifestDeclarations = z.object({ dependencies, devDependencies: dependencies })

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Every exact dependency the CLI can declare in one of its generated projects. */
function scaffoldPins(registry: Registry, cliRoot: string): Map<string, [string, string]> {
  const pins = new Map<string, [string, string]>()
  function add(declarations: Record<string, string> = {}): void {
    for (const [name, version] of Object.entries(declarations))
      if (isExactVersion(version)) pins.set(name + '@' + version, [name, version])
  }
  for (const section of Object.values(registry.toolchain ?? {})) add(section)
  for (const framework of [
    ...Object.values(registry.apiFrameworks ?? {}),
    ...Object.values(registry.appFrameworks ?? {}),
  ]) {
    add(framework.dependencies)
    add(framework.devDependencies)
  }
  for (const [name, entry] of Object.entries(registry.packages)) {
    add({ [name]: resolveMoleculeVersion(registry, name) })
    add(entry.buildTooling?.devDependencies)
  }
  const templates = join(cliRoot, 'templates', 'apps')
  if (existsSync(templates)) {
    for (const app of readdirSync(templates, { withFileTypes: true })) {
      if (!app.isDirectory()) continue
      for (const workspace of ['', 'app', 'api']) {
        const path = join(templates, app.name, workspace, 'package.json')
        if (!existsSync(path)) continue
        const manifest = manifestDeclarations.parse(readJson(path))
        add(manifest.dependencies)
        add(manifest.devDependencies)
      }
    }
  }
  return pins
}

function lockedScaffoldMetadata(cliRoot: string): Map<string, string | null> {
  const path = join(cliRoot, 'package-lock.json')
  if (!existsSync(path)) return new Map()
  const { packages } = lockShape.parse(readJson(path))
  const engines = new Map<string, string | null>()
  for (const [path, entry] of Object.entries(packages)) {
    if (!path.includes('node_modules/') || !entry.version) continue
    const name = path.split('node_modules/').at(-1)
    engines.set(name + '@' + entry.version, entry.engines?.node ?? null)
  }
  return engines
}

function sourceNodeEngine(
  registry: Registry,
  name: string,
  version: string,
  moleculeRoot?: string,
): string | null | undefined {
  const path = registry.packages[name]?.path
  if (!moleculeRoot || !path) return undefined
  // sync-registry has already selected the committed source export for this invocation.
  const manifest = join(moleculeRoot, path, 'package.json')
  if (!existsSync(manifest)) return undefined
  const metadata = exactMetadata.parse(readJson(manifest))
  if (metadata.name !== name || metadata.version !== version) return undefined
  return metadata.engines?.node ?? null
}

/** Refresh pin-specific metadata for a standalone CLI that ships no lockfile. */
export async function scaffoldNodePinMetadata(
  registry: Registry,
  cliRoot: string,
  { registryRoot = cliRoot, moleculeRoot }: { registryRoot?: string; moleculeRoot?: string } = {},
): Promise<Record<string, string | null>> {
  const result = new Map<string, string | null>()
  const locked = lockedScaffoldMetadata(cliRoot)
  const existing = registry.toolchainEngines?.pins ?? {}
  const remote = npmRegistryUrl(process.env, cliRoot)
  const missing: [string, [string, string]][] = []
  for (const [pin, input] of scaffoldPins(registry, cliRoot)) {
    const [name, version] = input
    let local = locked.get(pin)
    if (local === undefined && registryRoot !== cliRoot)
      local = sourceNodeEngine(registry, name, version, moleculeRoot)
    if (local !== undefined) result.set(pin, local)
    else if (Object.hasOwn(existing, pin)) result.set(pin, existing[pin])
    else missing.push([pin, input])
  }
  for (let start = 0; start < missing.length; start += 16) {
    await Promise.all(
      missing.slice(start, start + 16).map(async ([pin, [name, version]]) => {
        const url = remote + name.replace('/', '%2f') + '/' + encodeURIComponent(version)
        const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
        if (response.status === 404) {
          const source = sourceNodeEngine(registry, name, version, moleculeRoot)
          if (source !== undefined) {
            result.set(pin, source)
            return
          }
        }
        if (!response.ok)
          throw new Error(
            'Could not read Node engines for ' + pin + ' (npm HTTP ' + response.status + ')',
          )
        const metadata = exactMetadata.parse(await response.json())
        if (metadata.name !== name || metadata.version !== version)
          throw new Error('npm did not return the exact scaffold pin ' + pin)
        result.set(pin, metadata.engines?.node ?? null)
      }),
    )
  }
  return Object.fromEntries([...result].sort(([left], [right]) => left.localeCompare(right)))
}
