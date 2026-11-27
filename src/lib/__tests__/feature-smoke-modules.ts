import { execFile } from 'node:child_process'
import { copyFile, mkdir, readdir, readFile, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

import { getRawRegistry, loadMoleculeVersions } from '../registry.js'

const exec = promisify(execFile)
const fixture = new URL('./fixtures/feature-smoke-runtime/', import.meta.url)

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
  await exec('npm', ['ci', '--legacy-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: root,
    timeout: 120_000,
  })

  const modules = join(root, 'node_modules')
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
  const { dependencies } = JSON.parse(await readFile(manifest, 'utf8')) as {
    dependencies: Record<string, string>
  }
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
