/**
 * What a scaffolded app's auth token storage must be.
 *
 * X1 flash-m98 (2026-10-17) spent ~34 of its 60 minutes on "the session must survive a
 * page reload": the supplied Playwright suite reloads the page after sign-in and asserts
 * the signed-in state (`auth.spec.ts:78`, and the `user-fetch-errors` family re-injects
 * `localStorage['jwtToken']` before a reload), while `@molecule/app-auth` stores tokens in
 * MEMORY by default — so a scaffolded app lost its session on reload and nothing said so.
 * The executor hand-rolled a token store, a header wrapper and a restore probe, and ran out
 * the clock inside its own invention.
 *
 * The fix is wiring, not a package default (`@molecule/app-auth` keeps `'memory'`, and its
 * storage must stay the app's choice): the scaffold ships `src/browser-storage.ts` and the
 * auth bond the generator writes passes `createBrowserStorageAdapter()` to the client. The
 * flagship templates do the opposite on purpose — their APIs are the platform's
 * `@molecule/api-resource-user`, which sets an httpOnly session cookie, and the in-memory
 * default paired with that cookie is the STRONGER configuration (script cannot read the
 * cookie). So this file pins both facts against drift:
 *
 * 1. the base custom-scaffold template wires the persistent adapter (a reload keeps the
 *    session out of the box), and
 * 2. no scaffolded `authConfig` hardcodes a Web Storage area of its own — one adapter
 *    exists, at one path, so swapping it is one edit.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { InjectionPlan } from '../injector.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'

const LIB = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = join(LIB, '..', '..')
const TEMPLATES = join(ROOT, 'templates')
const BROWSER_STORAGE_TPL = join(TEMPLATES, 'app', 'shared', 'browser-storage.ts.tpl')

/** Every scaffolded app-config file: the base template + each flagship's config.ts. */
function authConfigFiles(): string[] {
  const files: string[] = []
  const base = join(TEMPLATES, 'app', 'shared', 'config.ts.tpl')
  if (existsSync(base)) files.push(base)
  const appsDir = join(TEMPLATES, 'apps')
  if (existsSync(appsDir)) {
    for (const app of readdirSync(appsDir)) {
      const cfg = join(appsDir, app, 'app', 'src', 'config.ts')
      if (existsSync(cfg)) files.push(cfg)
    }
  }
  return files
}

/** The `authConfig` object literal of one config file, as written. */
function authConfigBlock(file: string): string {
  const text = readFileSync(file, 'utf8')
  const start = text.indexOf('export const authConfig')
  if (start < 0) return ''
  const end = text.indexOf('\n}', start)
  return end < 0 ? text.slice(start) : text.slice(start, end)
}

/**
 * The template's adapter module, evaluated the way the scaffolded app runs it.
 *
 * The file is TypeScript, so it is transpiled with the repo's own compiler and
 * evaluated as CommonJS — the test then exercises the bytes the scaffold WRITES,
 * not a copy of them.
 */
async function loadTemplateAdapter(): Promise<{
  createBrowserStorageAdapter: (options?: unknown) => {
    getItem: (key: string) => string | null
    setItem: (key: string, value: string) => void
    removeItem: (key: string) => void
  }
}> {
  const source = readFileSync(BROWSER_STORAGE_TPL, 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  })
  const module = { exports: {} as Record<string, unknown> }

  new Function('exports', 'module', outputText)(module.exports, module)
  return module.exports as Awaited<ReturnType<typeof loadTemplateAdapter>>
}

const memoryStorage = (): {
  raw: Map<string, string>
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
} => {
  const raw = new Map<string, string>()
  return {
    raw,
    getItem: (key) => raw.get(key) ?? null,
    setItem: (key, value) => {
      raw.set(key, value)
    },
    removeItem: (key) => {
      raw.delete(key)
    },
  }
}

const mockJWT = (expSecondsFromNow: number): string =>
  `header.${Buffer.from(
    JSON.stringify({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + expSecondsFromNow }),
  ).toString('base64')}.signature`

describe('the scaffolded app keeps its session across a reload (flash-m98)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('the base template ships the browser adapter, and the auth bond the generator writes wires it', () => {
    expect(existsSync(BROWSER_STORAGE_TPL)).toBe(true)

    const plan: InjectionPlan = {
      molecule: '@molecule/app-auth',
      moleculePackage: {
        name: '@molecule/app-auth',
        version: '1.0.0',
        type: 'core',
        routes: [],
        tables: [],
        exports: [],
        path: '/tmp/test-app',
      },
      files: [],
      dependencies: [],
      migrations: [],
      bondSetup: null,
      conflicts: [],
    }
    const files = synthesizeAppProjectFiles(
      [plan],
      ['@molecule/app-auth'],
      '/tmp/test-app',
      loadRegistry(),
    )
    const bond = files.find((f) => f.targetPath.endsWith('bonds/auth-default.ts'))
    const adapter = files.find((f) => f.targetPath.endsWith('src/browser-storage.ts'))

    expect(bond?.content).toContain(
      "import { createBrowserStorageAdapter } from '../browser-storage.js'",
    )
    expect(bond?.content).toContain('createJWTAuthClient({')
    expect(bond?.content).toContain('storage: createBrowserStorageAdapter(),')
    // The module the bond imports is written by the SAME pass, so `mlcl add
    // @molecule/app-auth` on a project that has no such file is not left with a
    // dangling relative import (TS2307) in a file nobody wrote.
    expect(adapter, 'the bond imports a module this synthesis must write').toBeDefined()
    expect(adapter?.content).toContain('export function createBrowserStorageAdapter')
  })

  it('keeps the signed-in session when the app is reloaded', async () => {
    const local = memoryStorage()
    vi.stubGlobal('localStorage', local)
    const { createBrowserStorageAdapter } = await loadTemplateAdapter()

    const { createJWTAuthClient } = await import('@molecule/app-auth')
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ accessToken: mockJWT(3600), user: { id: 'u1', email: 'a@b.c' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const firstPage = createJWTAuthClient({
      baseURL: '/api',
      storage: createBrowserStorageAdapter({ storage: local }),
    })
    await firstPage.login({ email: 'a@b.c', password: 'pw' })
    expect(firstPage.isAuthenticated()).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // The reload: a new client over the same browser store, and no request — the
    // token the first page stored is what puts the user back.
    const reloaded = createJWTAuthClient({
      baseURL: '/api',
      storage: createBrowserStorageAdapter({ storage: local }),
    })
    await reloaded.initialize()

    expect(reloaded.isAuthenticated()).toBe(true)
    expect(reloaded.getUser()).toMatchObject({ email: 'a@b.c' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    firstPage.destroy()
    reloaded.destroy()
  })

  it('survives an unusable store instead of failing the login', async () => {
    vi.stubGlobal('localStorage', undefined)
    const { createBrowserStorageAdapter } = await loadTemplateAdapter()
    const adapter = createBrowserStorageAdapter()

    expect(() => adapter.setItem('molecule:auth:accessToken', 'tok')).not.toThrow()
    expect(adapter.getItem('molecule:auth:accessToken')).toBe('tok')
  })
})

describe('scaffolded auth token storage (M1-1 / L1-1)', () => {
  it('no scaffolded authConfig names a Web Storage area of its own', () => {
    const offenders = authConfigFiles().filter((f) =>
      /storage\s*:\s*(globalThis\.|window\.)?(localStorage|sessionStorage)/.test(
        authConfigBlock(f),
      ),
    )
    expect(
      offenders,
      `these scaffold configs hardcode the token store (use the adapter file instead):\n${offenders.join(
        '\n',
      )}`,
    ).toEqual([])
  })

  it('the flagship templates leave storage to the httpOnly cookie session, which is the stronger route', () => {
    const appsDir = join(TEMPLATES, 'apps')
    const offenders = readdirSync(appsDir)
      .map((app) => join(appsDir, app, 'app', 'src', 'config.ts'))
      .filter((cfg) => existsSync(cfg) && /(^|\s)storage\s*:/.test(authConfigBlock(cfg)))
    expect(
      offenders,
      `these flagship configs set auth token storage; their API sets an httpOnly session cookie, so the in-memory default is stronger:\n${offenders.join(
        '\n',
      )}`,
    ).toEqual([])
  })

  it('actually checks a meaningful number of config files (guard against a broken glob)', () => {
    // If this drops to ~0 the tests above are vacuously passing — fail loudly instead.
    expect(authConfigFiles().length).toBeGreaterThan(50)
  })
})
