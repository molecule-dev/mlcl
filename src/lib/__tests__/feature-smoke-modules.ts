import { execFile } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { z } from 'zod'

import { getRawRegistry, loadMoleculeVersions } from '../registry.js'

const exec = promisify(execFile)
const fixture = new URL('./fixtures/feature-smoke-runtime/', import.meta.url)
const pinsSchema = z.record(z.string(), z.string())
const fixtureManifest = z.object({ dependencies: pinsSchema, devDependencies: pinsSchema })
const packageIdentity = z.object({ name: z.string(), version: z.string() })

/**
 * Set up the published providers and locales that generated smoke tests import in standalone CI.
 * Keep the CLI's installed runner and core packages available via the same node_modules links.
 *
 * @param scratch - The fixture suite's private directory.
 * @param cliModules - The CLI's node_modules directory.
 * @returns The modules directory and registry snapshot for generated test projects.
 */
export async function featureSmokeModules(
  scratch: string,
  cliModules: string,
): Promise<{ modules: string; registry: string }> {
  const root = join(scratch, 'smoke-runtime')
  await mkdir(root)
  const manifest = join(root, 'package.json')
  await copyFile(new URL('package.json', fixture), manifest)
  await copyFile(new URL('package-lock.json', fixture), join(root, 'package-lock.json'))
  const { dependencies, devDependencies: shared } = fixtureManifest.parse(
    JSON.parse(await readFile(manifest, 'utf8')),
  )
  await exec(
    'npm',
    ['ci', '--no-legacy-peer-deps', '--strict-peer-deps', '--no-audit', '--no-fund'],
    { cwd: root, timeout: 120_000 },
  )

  const modules = join(root, 'node_modules')
  // The fixture lock declares the shared packages so npm validates the complete peer graph.
  // Use the CLI's copy at runtime so linked packages and new providers share the same bonds.
  for (const [name, version] of Object.entries(shared)) {
    const installed = join(cliModules, name)
    const actual = packageIdentity.parse(
      JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')),
    )
    if (actual.name !== name || actual.version !== version)
      throw new Error(
        `The fixture locks ${name}@${version}; CLI installed ${actual.name}@${actual.version}`,
      )
    await rm(join(modules, name), { recursive: true })
    await symlink(installed, join(modules, name))
  }
  const scopes = ['', '@molecule', '.bin']
  for (const scope of scopes) await mkdir(join(modules, scope), { recursive: true })
  for (const scope of scopes) {
    const source = join(cliModules, scope)
    const destination = join(modules, scope)
    const supplied = new Set(await readdir(destination))
    for (const name of await readdir(source))
      if (!supplied.has(name)) await symlink(join(source, name), join(destination, name))
  }

  // The fixtures intentionally bind these providers to the released versions in the lockfile.
  // The rest of the generated project's packages and all metadata use the current registry.
  const pins = loadMoleculeVersions()
  const registry = join(root, 'registry.json')
  await writeFile(
    registry,
    JSON.stringify({
      ...getRawRegistry(),
      moleculeVersions: { ...pins, overrides: { ...pins.overrides, ...dependencies } },
    }),
  )
  return { modules, registry }
}
