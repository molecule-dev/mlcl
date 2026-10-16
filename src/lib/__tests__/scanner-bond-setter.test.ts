/**
 * `scanBondSetter` — deriving the setter a provider bond must call.
 *
 * Nothing in a core's export list says which `set*` a provider bond belongs to,
 * so every consumer that picked by export ORDER broke the moment a core grew a
 * second setter: `@molecule/app-http` gaining
 * `setAuthGate(next: (() => Promise<void>) | null)` made every fresh scaffold
 * shipping `@molecule/app-http-axios` emit `setAuthGate(provider)` — a TS2345 in
 * the scaffold's own `app/src/bonds/app-http-axios.ts`, with the app registering
 * no HTTP client at all (2026-10-17).
 *
 * These cases pin the rule (object-typed parameter wins, function-typed and
 * closed-union parameters are never a provider registration) on fixtures, plus
 * one real-tree case so the rule is exercised against the shape that broke.
 *
 * @module
 */

import { access, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, describe, expect, it } from 'vitest'

import { scanBondSetter } from '../scanner.js'

const mlclRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

const tempDirs: string[] = []

/** Write a package `src/index.ts` holding `source` and return its `src/` path. */
async function fixtureSource(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'bond-setter-'))
  tempDirs.push(dir)
  const src = join(dir, 'src')
  await mkdir(src, { recursive: true })
  await writeFile(join(src, 'index.ts'), source)
  return src
}

/** True when `path` exists — used to skip the real-tree cases in a standalone clone. */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch (_error) {
    return false
  }
}

afterAll(async () => {
  for (const dir of tempDirs) await rm(dir, { recursive: true, force: true })
})

describe('scanBondSetter', () => {
  it('picks the setter that accepts the provider object, not the function-typed sibling', async () => {
    // The app-http shape, verbatim: setClient takes the provider interface while
    // setAuthGate takes a callback. Export order puts the callback first, which
    // is exactly what a name/position heuristic picked.
    const src = await fixtureSource(`
export interface HttpClient {
  request(url: string): Promise<void>
}
export const setAuthGate = (next: (() => Promise<void>) | null): void => {}
export const awaitAuthGate = async (): Promise<void> => {}
export const setClient = (client: HttpClient): void => {}
export const getClient = (): HttpClient => {
  throw new Error('not bonded')
}
`)
    expect(
      await scanBondSetter(src, ['setAuthGate', 'awaitAuthGate', 'setClient', 'getClient']),
    ).toBe('setClient')
  })

  it('ignores a closed string-literal union, keeping the provider setter', async () => {
    const src = await fixtureSource(`
export interface Logger {
  info(message: string): void
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
export const setLevel = (level: LogLevel): void => {}
export const getLevel = (): LogLevel => 'info'
export const setLogger = (newLogger: Logger): void => {}
`)
    expect(await scanBondSetter(src, ['setLevel', 'getLevel', 'setLogger'])).toBe('setLogger')
  })

  it('prefers setProvider when the package exports it', async () => {
    const src = await fixtureSource(`
export interface ThingProvider {
  run(): void
}
export const setFlag = (flag: FeatureFlag): void => {}
export const getFlag = (name: string): FeatureFlag | undefined => undefined
export const setProvider = (provider: ThingProvider): void => {}
export interface FeatureFlag {
  enabled: boolean
}
`)
    expect(await scanBondSetter(src, ['setFlag', 'getFlag', 'setProvider'])).toBe('setProvider')
  })

  it('uses the getter pairing when several object-typed setters survive', async () => {
    const src = await fixtureSource(`
export interface AlphaPool {}
export interface BetaStore {}
export const setBeta = (store: BetaStore): void => {}
export const setAlpha = (pool: AlphaPool): void => {}
export const getAlpha = (): AlphaPool => {
  throw new Error('not bonded')
}
`)
    // setBeta has no getter; setAlpha is the typed provider accessor pair.
    expect(await scanBondSetter(src, ['setBeta', 'setAlpha', 'getAlpha'])).toBe('setAlpha')
  })

  it('accepts a named-provider signature — the provider is the second parameter', async () => {
    const src = await fixtureSource(`
export interface MailProvider {
  send(): Promise<void>
}
export const setProvider = (name: string, provider: MailProvider): void => {}
`)
    expect(await scanBondSetter(src, ['setProvider'])).toBe('setProvider')
  })

  it('reads a multi-line function type as a function, not an object', async () => {
    const src = await fixtureSource(`
export type Middleware = (
  req: unknown,
  res: unknown,
  next: () => void,
) => void
export const setParser = (parser: Middleware): void => {}
`)
    expect(await scanBondSetter(src, ['setParser'])).toBeNull()
  })

  it('never proposes a name the package does not declare and export', async () => {
    const src = await fixtureSource(`
export interface HttpClient {
  request(url: string): Promise<void>
}
export const setInternal = (client: HttpClient): void => {}
`)
    // `setAuthGate` is a real export of the app-http CORE, not of this package:
    // a name the source does not declare can never be proposed, because the
    // generated import would not resolve.
    expect(await scanBondSetter(src, ['setAuthGate'])).toBeNull()
    expect(await scanBondSetter(src, ['setInternal'])).toBe('setInternal')
  })

  it('returns null when the only setter takes a function the bond cannot be', async () => {
    const src = await fixtureSource(`
export type ClassMerger = (classes: string[]) => string
export const setClassMerger = (merger: ClassMerger | null): void => {}
`)
    expect(await scanBondSetter(src, ['setClassMerger'])).toBeNull()
  })

  it('derives setClient from the real @molecule/app-http source', async () => {
    const src = join(mlclRoot, '..', 'molecule', 'packages', 'app', 'core', 'http', 'src')
    if (!(await exists(src))) return // standalone mlcl clone — no molecule sibling to scan
    expect(
      await scanBondSetter(src, [
        'setAuthGate',
        'awaitAuthGate',
        'HttpClient',
        'setClient',
        'getClient',
      ]),
    ).toBe('setClient')
  })
})
