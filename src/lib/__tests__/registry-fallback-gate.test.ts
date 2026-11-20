/**
 * The drift gate (`scripts/check-registry-exports.mjs`) with `--fallback-registry=<path>`: molecule's
 * pre-commit passes mlcl HEAD's registry there, because the working-tree registry is shared and
 * another session's uncommitted entry for a package refused a commit that changed none of its
 * exports (2026-11-20: app-ui-react's working-tree entry listed five `Kit*` types no commit had).
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const root = join(import.meta.dirname, '..', '..', '..')
const path = 'packages/app/features/probe-react'
const name = '@molecule/app-probe-react'
let scratch: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'mlcl-registry-fallback-'))
  mkdirSync(join(scratch, path, 'src'), { recursive: true })
  writeFileSync(join(scratch, path, 'package.json'), JSON.stringify({ name }))
  writeFileSync(join(scratch, path, 'src/index.ts'), 'export const Toast = 1\n')
})

afterEach(() => rmSync(scratch, { recursive: true, force: true }))

/** A one-package registry file listing `exports`. */
function registry(file: string, exports: string[]): string {
  const at = join(scratch, file)
  writeFileSync(
    at,
    JSON.stringify({
      version: 1,
      packages: {
        [name]: {
          type: 'feature',
          category: 'probe',
          stack: 'app',
          label: 'Probe',
          description: 'Fallback gate fixture',
          path,
          exports,
          moleculePeers: [],
        },
      },
    }),
  )
  return at
}

function runGate(
  working: string[],
  fallback?: string[],
): { status: number | null; output: string } {
  const args = ['--import', 'tsx', 'scripts/check-registry-exports.mjs']
  if (fallback) args.push(`--fallback-registry=${registry('head.json', fallback)}`)
  const result = spawnSync(process.execPath, [...args, path], {
    cwd: root,
    env: {
      ...process.env,
      MLCL_REGISTRY_PATH: registry('working.json', working),
      MOLECULE_PACKAGES_DIR: join(scratch, 'packages'),
    },
    encoding: 'utf8',
    timeout: 20_000,
  })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

describe('registry fallback gate', () => {
  it('passes a package whose working-tree entry is ahead when the fallback agrees', () => {
    const { status, output } = runGate(['KitEvent', 'Toast'], ['Toast'])
    expect(output).toContain(`${name}: in sync with`)
    expect(status, output).toBe(0)
  })

  it('still refuses that package without a fallback', () => {
    const { status, output } = runGate(['KitEvent', 'Toast'])
    expect(output).toContain('stale ["KitEvent"]')
    expect(status).toBe(1)
  })

  it('refuses drift that neither registry agrees with, naming the working-tree drift', () => {
    const { status, output } = runGate(['Toast', 'Gone'], ['Toast', 'Gone'])
    expect(output).toContain('stale ["Gone"]')
    expect(status).toBe(1)
  })

  it('passes on the working-tree entry alone, without reading the fallback', () => {
    const { status, output } = runGate(['Toast'], ['Stale'])
    expect(output).not.toContain('in sync with')
    expect(status, output).toBe(0)
  })
})
