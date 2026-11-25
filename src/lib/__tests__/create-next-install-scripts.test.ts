/**
 * create's closing output names the install scripts the project's `allowScripts` keeps off and says
 * none is needed.
 *
 * Harness eval scaffold, 2026-11-25: Codex read `"better-sqlite3": false` in the new package.json,
 * took the SQLite driver for unbuilt, and spent 10-50 s in 3 of 5 runs reading npm's logs and
 * loading the driver by hand (it loads the prebuilt binary its tarball ships).
 */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { projectOrientation } from '../create-next.js'
import { installScriptsOff } from '../install-scripts.js'

let root: string
const writeManifest = (allowScripts?: Record<string, boolean>): void =>
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'proj', allowScripts }))

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-create-next-'))
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('installScriptsOff', () => {
  it('names the entries kept off as decided, not those turned on or decided otherwise', () => {
    writeManifest({ esbuild: false, bcrypt: false, puppeteer: false, sharp: false, lmdb: true })
    const decisions = {
      bcrypt: { run: false },
      esbuild: { run: false },
      puppeteer: { run: true },
      lmdb: { run: false },
    }
    expect(installScriptsOff(root, decisions)).toEqual(['bcrypt', 'esbuild'])
  })

  it('names a package keyed by version, scoped or not, once', () => {
    writeManifest({ 'bcrypt@6.0.0': false, bcrypt: false, '@parcel/watcher@2.5.1': false })
    const decisions = { bcrypt: { run: false }, '@parcel/watcher': { run: false } }
    expect(installScriptsOff(root, decisions)).toEqual(['@parcel/watcher', 'bcrypt'])
  })

  it('reads nothing from a missing or malformed package.json', () => {
    expect(installScriptsOff(join(root, 'missing'))).toEqual([])
    for (const text of ['{ "name": "proj", }', 'null', '\uFEFF{"allowScripts":{"bcrypt":false}}']) {
      writeFileSync(join(root, 'package.json'), text)
      expect(() => projectOrientation(root)).not.toThrow()
    }
  })
})

describe('projectOrientation', () => {
  it('says the install scripts allowScripts keeps off are not needed (OLD MUSTFAIL)', () => {
    writeManifest({ bcrypt: false, esbuild: false })
    expect(projectOrientation(root)).toContain(
      'Install scripts off in package.json allowScripts, none of them needed: bcrypt, esbuild. A native one loads the prebuilt binary its package ships',
    )
  })

  it('counterexample: says nothing about install scripts when none is kept off', () => {
    writeManifest({ puppeteer: true })
    expect(projectOrientation(root).some((line) => line.startsWith('Install scripts'))).toBe(false)
    writeManifest()
    expect(projectOrientation(root).some((line) => line.startsWith('Install scripts'))).toBe(false)
  })
})
