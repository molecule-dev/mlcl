/**
 * `mlcl sync` names the one command that makes an API's sends show in the molecule.dev Activity
 * panel, and stays quiet when there is nothing to add.
 *
 * @module
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { activityCaptureHint } from '../sync.js'

const CAPTURE = '@molecule/api-activity-capture'
const INDEX = 'export async function setupBonds(): Promise<void> {\n}\n'

let root: string
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-sync-capture-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

/** An API at `dir` with a bonds index and these dependencies. */
function api(dir: string, dependencies: Record<string, string>): void {
  mkdirSync(join(dir, 'src', 'bonds'), { recursive: true })
  writeFileSync(join(dir, 'src', 'bonds', 'index.ts'), INDEX)
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x-api', dependencies }))
}

describe('activityCaptureHint', () => {
  it('names mlcl add, from the project root, for a full-stack API without the package', () => {
    api(join(root, 'api'), {})
    expect(activityCaptureHint(root)).toContain(`cd api && npx mlcl add ${CAPTURE} --inject`)
  })

  it('names it without a cd when the API is the project', () => {
    api(root, {})
    const hint = activityCaptureHint(root)
    expect(hint).toContain(`To record them: npx mlcl add ${CAPTURE} --inject`)
    expect(hint).not.toContain('cd api')
  })

  it('says nothing when the package is declared', () => {
    api(join(root, 'api'), { [CAPTURE]: '1.0.0' })
    expect(activityCaptureHint(root)).toBeNull()
  })

  // Counterexamples: nothing mlcl could add the package to.
  it('says nothing for an app with no API, or an API without a readable manifest', () => {
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'x-app' }))
    expect(activityCaptureHint(root)).toBeNull()
    mkdirSync(join(root, 'api', 'src', 'bonds'), { recursive: true })
    writeFileSync(join(root, 'api', 'src', 'bonds', 'index.ts'), INDEX)
    writeFileSync(join(root, 'api', 'package.json'), '{ not json')
    // The root has no bonds index, so there is still nothing to suggest.
    expect(activityCaptureHint(root)).toBeNull()
  })
})
