/**
 * Each package of a project's lock that has an install script and a registry decision gets an
 * `allowScripts` entry, so npm 11.20 neither warns about it nor skips a script that must run.
 *
 * r18 harness eval (2026-11-24): create ended its install with "3 packages have install scripts
 * not yet covered by allowScripts: bcrypt, better-sqlite3, esbuild", which only npm's log showed,
 * and Codex spent 11 s deciding whether they had to compile. The shipped starter locks are the
 * tree every custom create installs, so each of their scripted packages must carry a decision.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { writeInstallScriptEntries } from '../install-scripts.js'
import { loadInstallScriptDecisions } from '../registry.js'
import { readStarterLock } from '../starter-lock.js'

const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web']
const decisions = {
  bcrypt: { run: false },
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
  it('writes the decision of each scripted package in the lock, at any depth, by name', () => {
    writeLock({
      '': { name: 'proj' },
      'node_modules/bcrypt': { version: '6.0.0', hasInstallScript: true },
      'app/node_modules/esbuild': { version: '0.28.2', hasInstallScript: true },
      'node_modules/puppeteer': { version: '25.16.0' },
    })
    expect(writeInstallScriptEntries(root, { decisions })).toEqual({
      written: ['bcrypt', 'esbuild'],
      skipped: [],
    })
    expect(manifest().allowScripts).toEqual({ bcrypt: false, esbuild: false })
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
})
