/**
 * The resolved locks `mlcl create` installs a custom stack from (`starter-lock.ts`).
 *
 * Without one, a scaffold's first `npm install` resolved its whole tree from nothing: 90 s of a
 * 108 s cold create, nearly all of it fetching package metadata (scaffold-vs-plain review,
 * 2026-11-24). The shipped locks must name the `@molecule` versions a scaffold declares (else npm
 * resolves those again), point at npmjs only (npm maps that host to the configured registry, and a
 * local registry's address would break every install elsewhere), and list every platform's
 * optional binaries (a lock resolved for one machine breaks a project moved to another).
 *
 * @module
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getMoleculeVersion } from '../registry.js'
import { applyStarterLock, readStarterLock, STARTER_LOCK_DIR } from '../starter-lock.js'

/** The frameworks a custom full-stack create supports. */
const FRAMEWORKS = ['react', 'vue', 'svelte', 'solid', 'angular', 'react-native-web']

describe('applyStarterLock', () => {
  let dir: string
  let locks: string
  const lockFile = (): string => join(dir, 'package-lock.json')
  const entry = (version: string): Record<string, unknown> => ({
    version,
    resolved: `https://registry.npmjs.org/x/-/x-${version}.tgz`,
    integrity: 'sha512-x',
  })

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'mlcl-starter-lock-'))
    locks = join(dir, 'locks')
    mkdirSync(locks)
    writeFileSync(
      join(locks, 'react.json'),
      JSON.stringify({
        generatedFrom: { packages: [], moleculeVersions: {} },
        packages: { 'node_modules/express': entry('5.2.1'), 'node_modules/zod': entry('4.1.0') },
      }),
    )
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'demo', version: '0.1.0' }))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it('writes the whole lock when the project has none', () => {
    expect(applyStarterLock(dir, 'react', locks)).toBe(2)
    const lock = JSON.parse(readFileSync(lockFile(), 'utf8'))
    expect(lock).toMatchObject({ name: 'demo', version: '0.1.0', lockfileVersion: 3 })
    expect(Object.keys(lock.packages)).toEqual(['node_modules/express', 'node_modules/zod'])
  })

  // create's later install: the first one pruned what the manifests did not declare yet.
  it('adds back only the entries a lock lacks, keeping what npm wrote', () => {
    const written = {
      name: 'demo',
      lockfileVersion: 3,
      packages: { '': { name: 'demo' }, 'node_modules/express': entry('5.2.0') },
    }
    writeFileSync(lockFile(), JSON.stringify(written))
    expect(applyStarterLock(dir, 'react', locks)).toBe(1)
    const lock = JSON.parse(readFileSync(lockFile(), 'utf8'))
    expect(lock.packages['node_modules/express'].version).toBe('5.2.0')
    expect(lock.packages['node_modules/zod'].version).toBe('4.1.0')
    expect(lock.packages['']).toEqual({ name: 'demo' })

    expect(applyStarterLock(dir, 'react', locks)).toBe(0)
  })

  it('writes nothing for a framework mlcl ships no lock for', () => {
    expect(applyStarterLock(dir, 'vue', locks)).toBe(0)
    expect(existsSync(lockFile())).toBe(false)
  })

  it('gives an API-only project the react lock', () => {
    expect(readStarterLock(undefined, locks)).not.toBeNull()
  })
})

describe('the locks mlcl ships', () => {
  for (const framework of FRAMEWORKS) {
    describe(framework, () => {
      const lock = readStarterLock(framework, STARTER_LOCK_DIR)

      it('exists', () => {
        expect(lock, `run node scripts/generate-starter-locks.mjs ${framework}`).not.toBeNull()
      })

      it('names the @molecule versions a scaffold declares', () => {
        const stale = Object.entries(lock?.packages ?? {})
          .filter(([key]) => /^node_modules\/@molecule\/[^/]+$/.test(key))
          .map(([key, value]) => ({
            name: key.slice('node_modules/'.length),
            version: String(value.version),
          }))
          .filter(({ name, version }) => getMoleculeVersion(name) !== version)
          .map(({ name, version }) => `${name}@${version} (pinned ${getMoleculeVersion(name)})`)
        expect(stale, `run node scripts/generate-starter-locks.mjs ${framework}`).toEqual([])
      })

      it('points every source at npmjs', () => {
        const elsewhere = Object.entries(lock?.packages ?? {})
          .filter(([, value]) => typeof value.resolved === 'string')
          .filter(([, value]) => !String(value.resolved).startsWith('https://registry.npmjs.org/'))
          .map(([key]) => key)
        expect(elsewhere).toEqual([])
      })

      it("lists other platforms' optional binaries", () => {
        const oses = new Set(
          Object.values(lock?.packages ?? {}).flatMap((value) =>
            Array.isArray(value.os) ? (value.os as string[]) : [],
          ),
        )
        expect([...oses]).toEqual(expect.arrayContaining(['darwin', 'linux', 'win32']))
      })
    })
  }
})
