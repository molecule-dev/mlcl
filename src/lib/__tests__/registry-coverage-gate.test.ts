import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const packagePath = 'packages/api/core/coverage-probe'
const packageName = '@molecule/api-coverage-probe'
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-coverage-'))
  mkdirSync(join(scratch, packagePath, 'src'), { recursive: true })
  writeFileSync(join(scratch, packagePath, 'package.json'), JSON.stringify({ name: packageName }))
  writeFileSync(join(scratch, packagePath, 'src/index.ts'), 'export const probe = true\n')
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

function runGate(
  registered: boolean,
  scope: string[] = [packagePath],
  wrongPath = false,
): { status: number | null; output: string } {
  const registry = join(scratch, 'registry.json')
  writeFileSync(
    registry,
    JSON.stringify({
      version: 1,
      packages: registered
        ? {
            [packageName]: {
              type: 'core',
              category: 'coverage',
              stack: 'api',
              label: 'Coverage probe',
              description: 'Registry coverage fixture',
              path: wrongPath ? 'packages/api/core/wrong' : packagePath,
              exports: ['probe'],
            },
          }
        : {},
    }),
  )
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', 'scripts/check-registry-exports.mjs', ...scope],
    {
      cwd: root,
      env: {
        ...process.env,
        MLCL_REGISTRY_PATH: registry,
        MOLECULE_PACKAGES_DIR: join(scratch, 'packages'),
      },
      encoding: 'utf8',
      timeout: 10_000,
    },
  )
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

describe('registry coverage gate', () => {
  it('rejects a scoped existing package absent from the registry', () => {
    const result = runGate(false)
    expect(result.output).toContain(packageName)
    expect(result.status).toBe(1)
  })

  it('discovers unregistered packages during the full gate', () => {
    const result = runGate(false, [])
    expect(result.output).toContain(packageName)
    expect(result.status).toBe(1)
  })

  it('rejects a registered name pointing to the wrong source directory', () => {
    const result = runGate(true, [packagePath], true)
    expect(result.output).toContain(packageName)
    expect(result.status).toBe(1)
  })

  it('accepts a registered package whose exports match its source', () => {
    expect(runGate(true).status).toBe(0)
  })

  it('accepts the full registered tree', () => {
    expect(runGate(true, []).status).toBe(0)
  })

  it('allows a scoped package that was deleted in this commit', () => {
    rmSync(join(scratch, packagePath), { recursive: true })
    expect(runGate(false).status).toBe(0)
  })
})
