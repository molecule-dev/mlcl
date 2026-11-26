import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

import { CLI_COMMAND } from '#cli-command'
import semver from 'semver'

import type { Registry } from './schema.js'

interface PackageMetadata {
  version: string
  engines?: { node?: string }
}

/** The minimum version that satisfies every engine range, expressed as a floor. */
function commonNodeFloor(requirements: ReadonlyMap<string, string>): string {
  const ranges = [...requirements.values()].map((range) => new semver.Range(range))
  const candidates = ranges.flatMap((range) =>
    range.set.flatMap((comparators) => {
      const min = semver.minVersion(comparators.map(({ value }) => value).join(' '))
      if (!min) return []
      // An engine that excludes prereleases can still accept the corresponding release.
      return min.prerelease.length
        ? [min, new semver.SemVer(`${min.major}.${min.minor}.${min.patch}`)]
        : [min]
    }),
  )
  const minimum = candidates
    .sort(semver.compare)
    .find((version) => ranges.every((range) => range.test(version)))
  if (!minimum)
    throw new Error(
      `The scaffold pins have no common Node version: ${[...requirements].map(([pin, range]) => `${pin} (${range})`).join(', ')}`,
    )
  return `>=${minimum.version}`
}

/** Exact pins shared by scaffolded projects and those specific to each framework or build tool. */
function scaffoldPins(registry: Registry): Map<string, [string, string]> {
  const toolchain = Object.values(registry.toolchain ?? {})
  const frameworks = [
    ...Object.values(registry.apiFrameworks ?? {}),
    ...Object.values(registry.appFrameworks ?? {}),
  ].flatMap(({ dependencies, devDependencies }) => [dependencies, devDependencies])
  const tooling = Object.values(registry.packages).map((pkg) => pkg.buildTooling?.devDependencies)
  return new Map(
    [...toolchain, ...frameworks, ...tooling].flatMap((pins) =>
      Object.entries(pins ?? {}).map(([name, version]) => [`${name}@${version}`, [name, version]]),
    ),
  )
}

/** The standalone CLI lock records installed metadata, including nested versions of a pin. */
function lockedPackages(mlclDir: string): Map<string, PackageMetadata> {
  const path = join(mlclDir, 'package-lock.json')
  if (!existsSync(path)) return new Map()
  const lock = JSON.parse(readFileSync(path, 'utf8')) as {
    packages: Record<string, PackageMetadata>
  }
  return new Map(
    Object.entries(lock.packages).flatMap(([path, pkg]) => {
      const name = path.split('node_modules/').at(-1)
      return name && pkg.version ? [[`${name}@${pkg.version}`, pkg]] : []
    }),
  )
}

function installedPackage(
  roots: string[],
  name: string,
  version: string,
): PackageMetadata | undefined {
  for (const root of roots) {
    const path = join(root, name, 'package.json')
    if (!existsSync(path)) continue
    const pkg = JSON.parse(readFileSync(path, 'utf8')) as PackageMetadata
    if (pkg.version === version) return pkg
  }
  return undefined
}

/** Frameworks can pin packages the CLI itself never installs. Refresh their exact metadata on sync. */
function publishedNodeEngine(pin: string, cwd: string): string | null {
  const result = spawnSync(
    'npm',
    [
      'view',
      '--json',
      '--fetch-retries=0',
      '--fetch-timeout=15000',
      '--prefer-offline',
      '--',
      pin,
      'engines.node',
    ],
    { cwd, encoding: 'utf8' },
  )
  if (result.status !== 0)
    throw new Error(
      `Cannot read Node engines for ${pin}. Install that exact version or restore access to its npm registry, then run ${CLI_COMMAND} sync-registry --sync-toolchain.`,
    )
  return result.stdout.trim() ? (JSON.parse(result.stdout) as string | null) : null
}

/**
 * Read the Node engines of the CLI and scaffold pins. Prefer the installed exact version.
 * Carry metadata for pins missing from the standalone lock so a maintainer and CI
 * with different framework packages installed still compute the same floor.
 *
 * @param registry - The registry's current pins.
 * @param mlclDir - The CLI package root.
 * @param installRoot - The dependency root beside the registry.
 * @param refresh - Allow npm to fill in exact metadata for a newly pinned version.
 * @returns The minimum and the engine metadata absent from the standalone lock.
 */
export function scaffoldNodeRange(
  registry: Registry,
  mlclDir: string,
  installRoot = mlclDir,
  refresh = false,
): { node: string; pins: Record<string, string | null> } {
  const cli = JSON.parse(readFileSync(join(mlclDir, 'package.json'), 'utf8')) as PackageMetadata
  const requirements = new Map<string, string>()
  if (cli.engines?.node) requirements.set('mlcl', cli.engines.node)
  const roots = createRequire(resolve(installRoot, 'package.json')).resolve.paths('semver') ?? []
  const lock = lockedPackages(mlclDir)
  const pins: Record<string, string | null> = {}
  const dependencyPins = [...scaffoldPins(registry)].sort(([a], [b]) => a.localeCompare(b))
  for (const [pin, [name, version]] of dependencyPins) {
    const locked = lock.get(pin)
    const pkg = installedPackage(roots, name, version) ?? locked
    const node = pkg ? (pkg.engines?.node ?? null) : registry.toolchainEngines?.pins[pin]
    if (node === undefined && !refresh)
      throw new Error(
        `Missing Node engine metadata for ${pin}. Run ${CLI_COMMAND} sync-registry --sync-toolchain.`,
      )
    const engine = node === undefined ? publishedNodeEngine(pin, mlclDir) : node
    if (engine) requirements.set(pin, engine)
    if (!locked) pins[pin] = engine
  }
  return { node: commonNodeFloor(requirements), pins }
}
