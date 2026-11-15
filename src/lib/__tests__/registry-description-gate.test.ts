/**
 * The drift gate (`scripts/check-registry-exports.mjs`) for a package's description.
 *
 * A package carries its description twice: in its own `package.json` (what npm shows) and in
 * `registry.json` (what `mlcl search`, the MCP server and Synthase rank packages by). Both were
 * hand-written and 298 had drifted apart, so the registry copy is now scanned from the manifest
 * by `sync-registry --scan-exports`, and the gate fails a registry text the manifest no longer
 * matches.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const packagePath = 'packages/app/core/description-probe'
const packageName = '@molecule/app-description-probe'
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-description-'))
  mkdirSync(join(scratch, packagePath, 'src'), { recursive: true })
  writeFileSync(
    join(scratch, packagePath, 'src/index.ts'),
    '/** A probe. */\nexport const probe = 1\n',
  )
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

function runGate(
  manifestDescription: string | undefined,
  registryDescription: string,
): { status: number | null; output: string } {
  writeFileSync(
    join(scratch, packagePath, 'package.json'),
    JSON.stringify({
      name: packageName,
      ...(manifestDescription === undefined ? {} : { description: manifestDescription }),
    }),
  )
  const registry = join(scratch, 'registry.json')
  writeFileSync(
    registry,
    JSON.stringify({
      version: 1,
      packages: {
        [packageName]: {
          type: 'core',
          category: 'description-probe',
          stack: 'app',
          label: 'Description probe',
          description: registryDescription,
          path: packagePath,
          exports: ['probe'],
          moleculePeers: [],
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
      timeout: 20_000,
    },
  )
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

describe('registry description gate', () => {
  it("accepts a registry description equal to the package's own", () => {
    const result = runGate('Probe interface', 'Probe interface')
    expect(result.output).toContain('descriptions')
    expect(result.status).toBe(0)
  })

  it('rejects a registry description the package.json no longer matches', () => {
    const result = runGate('Probe interface for the probe bond', 'Probe interface')
    expect(result.status).toBe(1)
    expect(result.output).toContain('descriptions are out of sync')
    expect(result.output).toContain(
      '@molecule/app-description-probe: registry has "Probe interface", package.json has "Probe interface for the probe bond"',
    )
    expect(result.output).toContain('sync-registry --scan-exports')
  })

  it('leaves a package.json without a description to the molecule gate', () => {
    // molecule's check-package-metadata refuses the missing description; the registry keeps its
    // own text rather than being blanked.
    expect(runGate(undefined, 'Probe interface').status).toBe(0)
    expect(runGate('  ', 'Probe interface').status).toBe(0)
  })
})
