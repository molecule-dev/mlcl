/**
 * The drift gate (`scripts/check-registry-exports.mjs`) for a package that re-exports another
 * molecule package's root (`export * from '@molecule/app-ide-panel-logic'`): its entry lists the
 * re-exported names, and a scoped check of the re-exported package checks the re-exporter too.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const neutralPath = 'packages/app/features/probe-logic'
const neutralName = '@molecule/app-probe-logic'
const wrapperPath = 'packages/app/features/probe-react'
const wrapperName = '@molecule/app-probe-react'
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-reexport-'))
  for (const [path, name] of [
    [neutralPath, neutralName],
    [wrapperPath, wrapperName],
  ]) {
    mkdirSync(join(scratch, path, 'src'), { recursive: true })
    writeFileSync(join(scratch, path, 'package.json'), JSON.stringify({ name }))
  }
  writeFileSync(join(scratch, neutralPath, 'src/index.ts'), 'export const probe = true\n')
  writeFileSync(
    join(scratch, wrapperPath, 'src/index.ts'),
    `export * from '${neutralName}'\nexport const Panel = 1\n`,
  )
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

function runGate(
  exports: { neutral: string[]; wrapper: string[] },
  scope: string[],
): { status: number | null; output: string } {
  const registry = join(scratch, 'registry.json')
  const entry = (path: string, names: string[]): Record<string, unknown> => ({
    type: 'feature',
    category: 'probe',
    stack: 'app',
    label: 'Probe',
    description: 'Re-export gate fixture',
    path,
    exports: names,
    moleculePeers: [],
  })
  writeFileSync(
    registry,
    JSON.stringify({
      version: 1,
      packages: {
        [neutralName]: entry(neutralPath, exports.neutral),
        [wrapperName]: entry(wrapperPath, exports.wrapper),
      },
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

describe('registry re-export gate', () => {
  it("records the re-exported package's names in the re-exporter's entry, not a bare *", () => {
    const exports = { neutral: ['probe'], wrapper: ['Panel', 'probe'] }
    expect(runGate(exports, []).status).toBe(0)
    const unknown = runGate({ neutral: ['probe'], wrapper: ['*', 'Panel'] }, [wrapperPath])
    expect(unknown.status).toBe(1)
    expect(unknown.output).toContain(wrapperName)
  })

  it('checks the re-exporter when only the re-exported package is scoped', () => {
    // A new export in the neutral package, recorded for it but not for the re-exporter.
    writeFileSync(
      join(scratch, neutralPath, 'src/index.ts'),
      'export const probe = true\nexport const added = 1\n',
    )
    const result = runGate({ neutral: ['added', 'probe'], wrapper: ['Panel', 'probe'] }, [
      neutralPath,
    ])
    expect(result.status).toBe(1)
    expect(result.output).toContain(wrapperName)
    expect(
      runGate({ neutral: ['added', 'probe'], wrapper: ['Panel', 'added', 'probe'] }, [neutralPath])
        .status,
    ).toBe(0)
  })
})
