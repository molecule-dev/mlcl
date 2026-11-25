/**
 * The drift gate (`scripts/check-registry-exports.mjs`) for a package's Quick Start.
 *
 * Search returns the registry's copy of each package's README Quick Start on its first hits, so the
 * copy is built from the module `@example` blocks of `src/index.ts`, as the README's is. A new entry
 * without one passed this gate and was refused only by the release's full `sync-registry --check`
 * (2026-11-25, `@molecule/app-pointer-events-dom`).
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { expectedQuickStart } from '../registry-quick-start.js'

const root = join(import.meta.dirname, '..', '..', '..')
const packagePath = 'packages/app/core/quick-start-probe'
const packageName = '@molecule/app-quick-start-probe'
const withExample =
  "/**\n * A probe.\n *\n * @example\n * ```typescript\n * import { probe } from '@molecule/app-quick-start-probe'\n *\n * probe()\n * ```\n *\n * @module\n */\n\n/** Runs the probe. */\nexport const probe = (): number => 1\n"
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-quick-start-'))
  mkdirSync(join(scratch, packagePath, 'src'), { recursive: true })
  writeFileSync(
    join(scratch, packagePath, 'package.json'),
    JSON.stringify({ name: packageName, description: 'Probe interface' }),
  )
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

function runGate(
  source: string,
  quickStart: string | undefined,
  type = 'core',
): { status: number | null; output: string } {
  writeFileSync(join(scratch, packagePath, 'src/index.ts'), source)
  const registry = join(scratch, 'registry.json')
  writeFileSync(
    registry,
    JSON.stringify({
      version: 1,
      packages: {
        [packageName]: {
          type,
          category: 'quick-start-probe',
          stack: 'app',
          label: 'Quick Start probe',
          description: 'Probe interface',
          path: packagePath,
          exports: ['probe'],
          moleculePeers: [],
          runtimeDependencies: [],
          ...(quickStart === undefined ? {} : { quickStart }),
        },
      },
    }),
  )
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-registry-exports.mjs', packagePath],
    {
      cwd: root,
      env: {
        ...process.env,
        MLCL_REGISTRY_PATH: registry,
        MOLECULE_PACKAGES_DIR: join(scratch, 'packages'),
      },
      encoding: 'utf8',
      timeout: 30_000,
    },
  )
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

describe('registry Quick Start gate', () => {
  it('accepts the Quick Start the source yields', async () => {
    writeFileSync(join(scratch, packagePath, 'src/index.ts'), withExample)
    const quickStart = await expectedQuickStart({ type: 'core' }, join(scratch, packagePath))
    expect(quickStart).toContain('probe()')
    const result = runGate(withExample, quickStart!)
    expect(result.output).toContain('Quick Starts')
    expect(result.status).toBe(0)
  })

  it('rejects an entry without the Quick Start its source yields', () => {
    const result = runGate(withExample, undefined)
    expect(result.status).toBe(1)
    expect(result.output).toContain('Quick Starts are out of sync')
    expect(result.output).toContain(`${packageName}: registry has none, src/index.ts yields one`)
    expect(result.output).toContain(`sync-registry --scan-quick-starts ${packagePath}`)
  })

  it('rejects a Quick Start the source no longer has', () => {
    const result = runGate('/** A probe. */\nexport const probe = (): number => 1\n', 'probe()')
    expect(result.status).toBe(1)
    expect(result.output).toContain(
      `${packageName}: registry has one, src/index.ts has no @example`,
    )
  })

  it('leaves a feature without a Quick Start, as sync-registry does', () => {
    expect(runGate(withExample, undefined, 'feature').status).toBe(0)
  })
})
