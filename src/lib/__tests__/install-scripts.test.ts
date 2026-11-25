/**
 * Each package of a project's lock that has an install script and a registry decision gets an
 * `allowScripts` entry, so npm 11.20 neither warns about it nor skips a script that must run.
 *
 * r18 harness eval (2026-11-24): create ended its install with "3 packages have install scripts
 * not yet covered by allowScripts: bcrypt, better-sqlite3, esbuild", which only npm's log showed,
 * and Codex spent 11 s deciding whether they had to compile. The shipped starter locks are the
 * tree every custom create installs, so each of their scripted packages must carry a decision.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  decideBeforeInstall,
  pruneUnusedEntries,
  writeInstallScriptEntries,
} from '../install-scripts.js'
import { loadInstallScriptDecisions } from '../registry.js'
import { readStarterLock } from '../starter-lock.js'

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web']
const decisions = {
  bcrypt: { run: false },
  'better-sqlite3': { run: false },
  puppeteer: { run: true },
  esbuild: { run: false },
}

let root: string
const manifest = (): Record<string, unknown> & { allowScripts?: Record<string, boolean> } =>
  JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const writeLock = (packages: Record<string, unknown>): void =>
  writeFileSync(join(root, 'package-lock.json'), JSON.stringify({ lockfileVersion: 3, packages }))

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'mlcl-install-scripts-'))
  writeFileSync(join(root, 'package.json'), `${JSON.stringify({ name: 'proj' }, null, 2)}\n`)
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe('writeInstallScriptEntries', () => {
  it('writes the decision of each decided package in the lock, at any depth, by name', () => {
    // better-sqlite3's entry names no script (`gypfile: false`), yet an install from the lock
    // compiles it: the decision goes by name, not by the entry (harness eval scaffold, 2026-11-25).
    writeLock({
      '': { name: 'proj' },
      'node_modules/bcrypt': { version: '6.0.0', hasInstallScript: true },
      'app/node_modules/esbuild': { version: '0.28.2', hasInstallScript: true },
      'node_modules/better-sqlite3': { version: '13.0.3' },
      'node_modules/react': { version: '19.2.4' },
    })
    expect(writeInstallScriptEntries(root, { decisions })).toEqual({
      written: ['bcrypt', 'better-sqlite3', 'esbuild'],
      skipped: [],
    })
    expect(manifest().allowScripts).toEqual({
      bcrypt: false,
      'better-sqlite3': false,
      esbuild: false,
    })
  })

  it('leaves the user’s entries, for the name or a version of it, and undecided packages alone', () => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'proj', allowScripts: { 'bcrypt@6.0.0': true } }),
    )
    writeLock({
      'node_modules/bcrypt': { hasInstallScript: true },
      'node_modules/sharp': { hasInstallScript: true },
    })
    expect(writeInstallScriptEntries(root, { decisions }).written).toEqual([])
    expect(manifest().allowScripts).toEqual({ 'bcrypt@6.0.0': true })
  })

  it('reports an approved package that is already installed: its script was skipped', () => {
    writeLock({ 'node_modules/puppeteer': { hasInstallScript: true } })
    mkdirSync(join(root, 'node_modules', 'puppeteer'), { recursive: true })
    writeFileSync(join(root, 'node_modules', 'puppeteer', 'package.json'), '{}')
    expect(writeInstallScriptEntries(root, { decisions })).toEqual({
      written: ['puppeteer'],
      skipped: ['puppeteer'],
    })
    expect(manifest().allowScripts).toEqual({ puppeteer: true })
  })

  it('reads given lock entries instead of a lockfile, and does nothing without either', () => {
    expect(writeInstallScriptEntries(root, { decisions })).toEqual({ written: [], skipped: [] })
    expect(manifest().allowScripts).toBeUndefined()
    writeInstallScriptEntries(root, {
      decisions,
      lock: { 'node_modules/esbuild': { hasInstallScript: true } },
    })
    expect(manifest().allowScripts).toEqual({ esbuild: false })
  })
})

describe('decideBeforeInstall and pruneUnusedEntries', () => {
  it('decide every package before an install, and drop the ones it did not bring', () => {
    writeLock({ 'node_modules/esbuild': { hasInstallScript: true } })
    const { written } = decideBeforeInstall(root, { decisions, wholeTree: true })
    expect(written).toEqual(['bcrypt', 'better-sqlite3', 'esbuild', 'puppeteer'])
    expect(manifest().allowScripts).toEqual({
      bcrypt: false,
      'better-sqlite3': false,
      esbuild: false,
      puppeteer: true,
    })
    writeLock({
      'node_modules/esbuild': { hasInstallScript: true },
      'node_modules/better-sqlite3': { version: '13.0.3' },
    })
    expect(pruneUnusedEntries(root, written)).toEqual(['bcrypt', 'puppeteer'])
    expect(manifest().allowScripts).toEqual({ 'better-sqlite3': false, esbuild: false })
  })

  it('leave the packages of an app mlcl did not create to it, and its own entries in place', () => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'proj', allowScripts: { sharp: true } }),
    )
    writeLock({ 'node_modules/esbuild': { hasInstallScript: true } })
    const { written } = decideBeforeInstall(root, { decisions })
    expect(written).not.toContain('esbuild')
    rmSync(join(root, 'package-lock.json'))
    expect(pruneUnusedEntries(root, written)).toEqual(written)
    expect(manifest()).toEqual({ name: 'proj', allowScripts: { sharp: true } })
  })

  it('remove the field they added once nothing is left in it', () => {
    const { written } = decideBeforeInstall(root, { decisions, wholeTree: true })
    pruneUnusedEntries(root, written)
    expect(manifest()).toEqual({ name: 'proj' })
  })
})

describe('the registry decides every install script in the shipped starter locks', () => {
  it.each(FRAMEWORKS)('%s', (framework) => {
    const registry = loadInstallScriptDecisions()
    const scripted = Object.entries(readStarterLock(framework)?.packages ?? {})
      .filter(([, entry]) => (entry as { hasInstallScript?: boolean }).hasInstallScript)
      .map(([key]) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length))
    expect(scripted.length).toBeGreaterThan(0)
    expect(
      scripted.filter((name) => !registry[name]),
      'add each to registry.json installScripts with run and the reason, read from its source',
    ).toEqual([])
  })

  it('including each native package whose lock entry names no script but which npm compiles', () => {
    // An install from a lock runs `node-gyp rebuild` for every package with a binding.gyp and no
    // install script, `gypfile: false` or not. The lock does not say which those are; an installed
    // copy does, where this checkout has one.
    const registry = loadInstallScriptDecisions()
    const require = createRequire(import.meta.url)
    const names = new Set(
      FRAMEWORKS.flatMap((framework) =>
        Object.keys(readStarterLock(framework)?.packages ?? {})
          .filter((key) => key.includes('node_modules/'))
          .map((key) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length)),
      ),
    )
    const native = [...names].filter((name) => {
      try {
        const dir = dirname(require.resolve(`${name}/package.json`))
        const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
          scripts?: Record<string, string>
        }
        return (
          existsSync(join(dir, 'binding.gyp')) && !pkg.scripts?.install && !pkg.scripts?.preinstall
        )
      } catch (_error) {
        // Not installed in this checkout, or its exports hide package.json: nothing to read.
        return false
      }
    })
    expect(
      native.filter((name) => !registry[name]),
      'add each to registry.json installScripts with run and the reason, read from its source',
    ).toEqual([])
  })
})
