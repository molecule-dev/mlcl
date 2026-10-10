/**
 * `addHuskyToPackageJson` documents that it "preserves any existing `prepare`
 * script by chaining", but the guard that decided between chaining and
 * replacing tested whether the script MENTIONED husky anywhere — so a project
 * whose `prepare` already chained it (`"npm run build && husky"`) fell into the
 * else branch and was rewritten as a bare `"husky"`, silently dropping the
 * build step. Being read on both scaffold paths (the flagship `--template` fast
 * path and a custom build dropped onto an existing project), the rewrite
 * reached every one of them.
 *
 * Driven through the exported `scaffoldSecurityWorkflow` (the function that
 * wires husky for both paths) against a real temp directory, so nothing about
 * the write path is stubbed.
 *
 * @module
 */

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { scaffoldSecurityWorkflow } from '../scaffold.js'

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-husky-prepare-'))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

/** Write a root package.json carrying `script`, then wire the security workflow. */
async function prepareAfterWiring(script: string | undefined): Promise<string | undefined> {
  const pkg: { scripts?: Record<string, string> } = {}
  if (script !== undefined) pkg.scripts = { prepare: script, build: 'tsc -b' }
  await writeFile(join(dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

  await scaffoldSecurityWorkflow(dir, 'my-app')

  const written = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
    scripts?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  expect(written.devDependencies?.husky).toBe('9.1.7')
  return written.scripts?.prepare
}

describe('addHuskyToPackageJson — an existing prepare script is preserved', () => {
  it('keeps a prepare that already runs husky last, instead of reducing it to `husky`', async () => {
    // Pre-fix this came back as exactly 'husky': the build step was gone.
    expect(await prepareAfterWiring('npm run build && husky')).toBe('npm run build && husky')
  })

  it('chains husky onto a prepare that does not run it yet', async () => {
    expect(await prepareAfterWiring('npm run build')).toBe('npm run build && husky')
  })

  it('writes a bare `husky` when there is no prepare at all', async () => {
    expect(await prepareAfterWiring(undefined)).toBe('husky')
  })

  it('is idempotent — a second wiring pass changes nothing', async () => {
    const first = await prepareAfterWiring('npm run build && husky')
    await scaffoldSecurityWorkflow(dir, 'my-app')
    const second = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>
    }
    expect(second.scripts?.prepare).toBe(first)
  })
})
