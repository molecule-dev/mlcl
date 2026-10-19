/**
 * The bond-wiring setter is chosen by the interface package's registry
 * `bondSetter`, never by export order.
 *
 * `@molecule/app-http` exports two `set*` functions — `setAuthGate` (the
 * auth-restore gate, `(() => Promise<void>) | null`) and `setClient` (the
 * provider accessor, `HttpClient`). Picking by order emitted
 * `setAuthGate(provider)` into every fresh scaffold's own
 * `app/src/bonds/app-http-axios.ts`: a TS2345 that holds the run's Playwright
 * phase, with the starter app registering no HTTP client at all and the axios
 * provider never used (2026-10-17).
 *
 * Two surfaces, one rule: the bond-file generator (`generateBondSetupCode`) and
 * the README generator's `## Bond Wiring` section both read the value the scanner
 * derives (`bondSetter`, kept current by `sync-registry --scan-exports`).
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { generateMoleculeMd, type GeneratorOptions, type PackageJson } from '../docs-generator.js'
import { generateBondSetupCode } from '../injector.js'
import { scanPackage } from '../scanner.js'
import type { RegistryEntry } from '../schema.js'

const mlclRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const moleculeRoot = join(mlclRoot, '..', 'molecule')

const registry = JSON.parse(readFileSync(join(mlclRoot, 'registry.json'), 'utf-8')) as {
  packages: Record<string, RegistryEntry>
}

// ============================================================================
// Bond file generation
// ============================================================================

describe('generateBondSetupCode — the interface package picks the setter', () => {
  it('scaffolds @molecule/app-http-axios with setClient, never the auth gate', async () => {
    const bondPath = join(moleculeRoot, 'packages', 'app', 'bonds', 'http', 'axios')
    if (!existsSync(join(bondPath, 'src'))) return // standalone mlcl clone — no molecule sibling

    const pkg = await scanPackage(bondPath)
    const code = await generateBondSetupCode(pkg, 'app-http-axios', '@molecule/app-http', mlclRoot)

    // The regression: export order put setAuthGate first.
    expect(code).toContain('setClient(createAxiosClient({ baseURL: API_BASE_URL }))')
    // xr-molecule-flash-m206: the provider's factory defaults to `baseURL: ''`, so a page's
    // `getClient().get('/tags')` requested the PAGE origin and read the front's `index.html`.
    // The bond passes the app's own `/api` prefix instead, and page code calls the route.
    expect(code).toContain("import { API_BASE_URL } from '../config.js'")
    expect(code).not.toContain('setClient(provider)')
    expect(code).not.toContain('setAuthGate')
  })

  it('records setClient as the registry bond setter for @molecule/app-http', () => {
    // The value the generator above consults — a hand-edit or a scan regression
    // here silently reintroduces the broken scaffold.
    expect(registry.packages['@molecule/app-http']?.bondSetter).toBe('setClient')
  })
})

// ============================================================================
// README Bond Wiring section
// ============================================================================

describe('generateMoleculeMd — Bond Wiring uses the registry-declared setter', () => {
  /** The @molecule/app-http core, whose two setters are what broke the pick. */
  const appHttpCore: RegistryEntry = {
    language: 'typescript',
    runtime: 'node',
    type: 'core',
    category: 'http',
    label: 'HTTP Client',
    description: 'HTTP client with interceptors and providers',
    stack: 'app',
    exports: ['setAuthGate', 'awaitAuthGate', 'setClient', 'getClient', 'HttpClient'],
    secrets: [],
    runtimeDependencies: [],
    bondSetter: 'setClient',
    path: 'packages/app/core/http',
  }

  const axiosBond: RegistryEntry = {
    language: 'typescript',
    runtime: 'node',
    type: 'provider',
    category: 'http',
    label: 'Axios',
    description: 'Axios HTTP client provider for @molecule/app-http',
    stack: 'app',
    implements: '@molecule/app-http',
    exports: ['createAxiosClient', 'provider'],
    secrets: [],
    runtimeDependencies: ['axios'],
    path: 'packages/app/bonds/http/axios',
  }

  const pkgJson: PackageJson = { name: '@molecule/app-http-axios', version: '1.0.4' }

  it('documents setClient(provider), not the setter that merely comes first', () => {
    const result = generateMoleculeMd({ exports: [] }, axiosBond, pkgJson, {
      moleculeDir: moleculeRoot,
      coreInterfaceEntry: appHttpCore,
      coreInterfaceName: '@molecule/app-http',
    } satisfies GeneratorOptions)

    expect(result).toContain('## Bond Wiring')
    expect(result).toContain("import { setClient } from '@molecule/app-http'")
    expect(result).toContain('setClient(provider)')
    expect(result).not.toContain('setAuthGate(provider)')
  })
})
