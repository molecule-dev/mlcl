/**
 * The drift gate (`scripts/check-registry-exports.mjs`) for the bond-file declarations.
 *
 * A generated bond file shows `registry.json` `declarations`, scanned from the package source,
 * because a published package ships no source a production scaffold could read. A stale text is a
 * wrong signature in every new scaffold, and a `declare` name the source does not declare shows
 * nothing at all, so the gate fails on both and accepts only the scanned text.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const packagePath = 'packages/app/core/declarations-probe'
const packageName = '@molecule/app-declarations-probe'
const SCANNED = 'interface ProbeConfig {\n  baseURL?: string;\n}'
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-declarations-'))
  mkdirSync(join(scratch, packagePath, 'src'), { recursive: true })
  writeFileSync(join(scratch, packagePath, 'package.json'), JSON.stringify({ name: packageName }))
  writeFileSync(
    join(scratch, packagePath, 'src/index.ts'),
    [
      '/** The probe config. */',
      'export interface ProbeConfig {',
      '  /** where requests go */',
      '  baseURL?: string',
      '}',
      'export function createProbe(config: ProbeConfig = {}): ProbeConfig {',
      '  return config',
      '}',
      'export function setProbe(probe: ProbeConfig): void {',
      '  void probe',
      '}',
      '',
    ].join('\n'),
  )
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

function runGate(
  declare: string[],
  declarations?: Record<string, string>,
): { status: number | null; output: string } {
  const registry = join(scratch, 'registry.json')
  writeFileSync(
    registry,
    JSON.stringify({
      version: 1,
      packages: {
        [packageName]: {
          type: 'core',
          category: 'declarations-probe',
          stack: 'app',
          label: 'Declarations probe',
          description: 'Bond-file declarations fixture',
          path: packagePath,
          exports: ['ProbeConfig', 'createProbe', 'setProbe'],
          bondSetter: 'setProbe',
          moleculePeers: [],
          declare,
          ...(declarations ? { declarations } : {}),
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

describe('registry bond-file declarations gate', () => {
  it('accepts the scanned declarations', () => {
    const result = runGate(['ProbeConfig'], { ProbeConfig: SCANNED })
    expect(result.output).toContain('bond-file declarations')
    expect(result.status).toBe(0)
  })

  it('accepts a package that declares nothing', () => {
    expect(runGate([]).status).toBe(0)
  })

  it('rejects a recorded text the source no longer matches', () => {
    const result = runGate(['ProbeConfig'], {
      ProbeConfig: 'interface ProbeConfig {\n  baseUrl?: string;\n}',
    })
    expect(result.status).toBe(1)
    expect(result.output).toContain('bond-file declarations are out of sync')
    expect(result.output).toContain('stale ["ProbeConfig"]')
    expect(result.output).toContain('sync-registry --scan-exports')
  })

  it('rejects a declare name whose text was never scanned', () => {
    const result = runGate(['ProbeConfig', 'createProbe'], { ProbeConfig: SCANNED })
    expect(result.status).toBe(1)
    expect(result.output).toContain('stale ["createProbe"]')
  })

  it('rejects a recorded text for a name no longer declared', () => {
    const result = runGate([], { ProbeConfig: SCANNED })
    expect(result.status).toBe(1)
    expect(result.output).toContain('stale ["ProbeConfig"]')
  })

  it('rejects a declare name the source does not declare', () => {
    const result = runGate(['ProbeConfig', 'ProbeClient'], { ProbeConfig: SCANNED })
    expect(result.status).toBe(1)
    expect(result.output).toContain('"ProbeClient"')
    expect(result.output).toContain('fix the declare list')
  })
})
