/**
 * The browser-profile crash class needs a STANDING gate.
 *
 * `@molecule/api-bonds-default-express`'s `setup*()` helpers wire a provider
 * bond by LAZILY importing it from the app's own node_modules at call time
 * (`await import('@molecule/api-database-pglite')` inside `setupDatabasePglite`,
 * `@molecule/api-rate-limit-memory` inside `setupRateLimitMemory`, …). A
 * template that calls one of those helpers therefore DEPENDS on the provider
 * package at runtime, and a pin that sits only in `devDependencies` (or no pin
 * at all) survives every local run — then production deploys prune dev deps
 * (`--omit=dev`), the lazy import fails with ERR_MODULE_NOT_FOUND, and the API
 * crash-loops at boot. kanban-board shipped exactly that on 2026-10-08
 * (`setupDatabasePglite` + `setupPaymentsCapture` on dev pins), and the sweep
 * that fixed it found the same hole in every `setupRateLimitMemory` caller
 * (150 templates) plus delivery-tracking, investment-portfolio and
 * messaging-app — 155 files changed. That sweep's own commit message credits
 * "the new gate" that found them, but no such gate was committed: nothing in
 * the suite stood between the next template (or the next lazy setup helper)
 * and the same silent production crash.
 *
 * This file is that gate. It derives the helper → lazily-imported-provider
 * mapping from the bond-setup package's REAL source (not a hand-copied list,
 * which would drift the first time a helper is added), scans every template's
 * api workspace for calls, and requires each provider in the template's
 * PRODUCTION `dependencies`. Like the migration-runner's drift guard, the
 * fleet scans skip in an mlcl-only checkout without the sibling molecule repo;
 * the pure-function tests below run everywhere and prove the checks can fail.
 *
 * @module
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PACKAGE_ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES_DIR = join(PACKAGE_ROOT, 'templates', 'apps')
const REGISTRY_PATH = join(PACKAGE_ROOT, 'registry.json')
/**
 * The bond-setup package whose helpers the templates call. Workspace-only: an
 * mlcl-only clone (CI, a fresh install) has no sibling molecule checkout.
 */
const SETUP_TS = join(
  PACKAGE_ROOT,
  '..',
  'molecule',
  'packages',
  'api',
  'infrastructure',
  'bonds-default-express',
  'src',
  'setup.ts',
)

/** Every `export … function setup<X>()` with the @molecule/* packages it lazily imports. */
export interface LazySetupHelper {
  /** The helper's name, e.g. `setupRateLimitMemory`. */
  name: string
  /** The imported packages whose registry type is NOT `core` — the runtime needs. */
  providers: string[]
}

/**
 * Derive the lazy-import map from the bond-setup package's own source.
 *
 * A helper's body may import the core it wires AND the provider it wires it
 * to; only the provider is the package the CALLING app must declare (the core
 * is declared by whichever feature pulled it in). `packageType` answers the
 * registry's `type` for a package name; anything the registry does not type as
 * `core` counts as a provider — an untyped/unknown import is treated as
 * needed, never assumed absent.
 *
 * @param setupSource - The bond-setup package's `setup.ts` source.
 * @param packageType - Registry type lookup (`'core'`, `'provider'`, …).
 * @returns One entry per exported `setup*()` function that lazily imports a
 *   non-core package, in source order.
 */
export function lazySetupHelpers(
  setupSource: string,
  packageType: (name: string) => string | undefined,
): LazySetupHelper[] {
  const helpers: LazySetupHelper[] = []
  // Top-level functions close at column 0; everything nested is indented.
  const re = /export (?:async )?function (setup[A-Za-z0-9]+)\(\)[^{]*\{([\s\S]*?)\n\}/g
  let match: RegExpExecArray | null
  while ((match = re.exec(setupSource)) !== null) {
    const imports = [...match[2].matchAll(/import\(\s*['"](@molecule\/[a-z0-9-]+)['"]\s*\)/g)].map(
      (m) => m[1],
    )
    const providers = [...new Set(imports.filter((name) => packageType(name) !== 'core'))]
    if (providers.length > 0) helpers.push({ name: match[1], providers })
  }
  return helpers
}

/**
 * Drop comments while keeping string contents, so a prose mention of a helper
 * ("// setupRateLimitMemory is wired below") cannot read as a call, and a
 * `//` inside a string ("https://…") cannot truncate the scan.
 *
 * @param source - TypeScript source.
 * @returns The source with comments removed.
 */
export function stripComments(source: string): string {
  let out = ''
  let quote: string | null = null
  let inLineComment = false
  let inBlockComment = false
  for (let i = 0; i < source.length; i++) {
    const ch = source.charAt(i)
    const next = source.charAt(i + 1)
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
        out += ch
      }
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (quote) {
      out += ch
      if (ch === '\\') {
        out += next ?? ''
        i++
      } else if (ch === quote) {
        quote = null
      }
      continue
    }
    if (ch === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      continue
    }
    out += ch
  }
  return out
}

/**
 * Which of `providers` the manifest fails to back in PRODUCTION `dependencies`.
 *
 * @param manifest - The parsed api `package.json`.
 * @param providers - Package names a called setup helper lazily imports.
 * @returns The providers that are missing entirely or pinned only as
 *   devDependencies (which a production deploy prunes).
 */
export function unbackedProviders(
  manifest: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> },
  providers: readonly string[],
): string[] {
  const deps = manifest.dependencies ?? {}
  return providers.filter((name) => !deps[name])
}

/** Read every `.ts` file under `dir`, recursively, concatenated. */
function tsSources(dir: string): string {
  let out = ''
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out += tsSources(path)
    else if (entry.name.endsWith('.ts')) out += readFileSync(path, 'utf-8')
  }
  return out
}

describe('lazySetupHelpers — the derivation', () => {
  const typeOf = (name: string): string | undefined =>
    name === '@molecule/api-example-core' ? 'core' : 'provider'

  it('pairs each helper with the non-core packages its body lazily imports', () => {
    const source = [
      'export async function setupOne(): Promise<void> {',
      '  const [a, b] = await Promise.all([',
      "    import('@molecule/api-example-core'),",
      "    import('@molecule/api-example-provider'),",
      '  ])',
      '  a.setProvider(b.provider)',
      '}',
      '',
      'export async function setupTwo(): Promise<void> {',
      "  const { provider } = await import('@molecule/api-example-other')",
      '  set(provider)',
      '}',
    ].join('\n')
    const helpers = lazySetupHelpers(source, typeOf)
    expect(helpers).toEqual([
      { name: 'setupOne', providers: ['@molecule/api-example-provider'] },
      { name: 'setupTwo', providers: ['@molecule/api-example-other'] },
    ])
  })

  it('skips helpers whose imports are all cores — nothing to declare', () => {
    const source = [
      'export async function setupCoreOnly(): Promise<void> {',
      "  const { setProvider } = await import('@molecule/api-example-core')",
      '  setProvider({})',
      '}',
    ].join('\n')
    expect(lazySetupHelpers(source, typeOf)).toEqual([])
  })

  it('treats a package the registry does not type as needed, not absent', () => {
    const source = [
      'export async function setupUnknown(): Promise<void> {',
      "  await import('@molecule/api-not-in-registry')",
      '}',
    ].join('\n')
    expect(lazySetupHelpers(source, typeOf)).toEqual([
      { name: 'setupUnknown', providers: ['@molecule/api-not-in-registry'] },
    ])
  })
})

describe('stripComments / unbackedProviders — the check can fail', () => {
  it('reads a call in code but not a prose mention, and keeps `//` inside strings', () => {
    const source = [
      "const docs = 'see https://example.test/setupRateLimitMemory'",
      '// setupRateLimitMemory is wired in bonds/index.ts, not here.',
      'await setupRateLimitMemory()',
    ].join('\n')
    const code = stripComments(source)
    expect(code.includes('setupRateLimitMemory()')).toBe(true)
    expect(code).toContain('https://example.test')
    expect(code.includes('// setupRateLimitMemory is wired')).toBe(false)
  })

  it('flags a dev-only pin and a missing pin, passes a production pin', () => {
    const providers = ['@molecule/api-rate-limit-memory']
    expect(
      unbackedProviders(
        { dependencies: { '@molecule/api-rate-limit-memory': '1.0.0' } },
        providers,
      ),
    ).toEqual([])
    expect(
      unbackedProviders(
        { dependencies: {}, devDependencies: { '@molecule/api-rate-limit-memory': '1.0.0' } },
        providers,
      ),
    ).toEqual(['@molecule/api-rate-limit-memory'])
    expect(unbackedProviders({ dependencies: {} }, providers)).toEqual([
      '@molecule/api-rate-limit-memory',
    ])
  })
})

describe('the template fleet backs every lazily-imported bond in production deps', () => {
  const itInWorkspace = it.runIf(existsSync(SETUP_TS))

  itInWorkspace('every setup helper a template calls is production-backed', () => {
    const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf-8')) as {
      packages: Record<string, { type?: string }>
    }
    const typeOf = (name: string): string | undefined => registry.packages[name]?.type
    const helpers = lazySetupHelpers(readFileSync(SETUP_TS, 'utf-8'), typeOf)
    // The derivation must see the real surface, or everything below is vacuous.
    expect(helpers.length).toBeGreaterThanOrEqual(20)
    expect(helpers.some((h) => h.name === 'setupRateLimitMemory')).toBe(true)

    const providersOf = new Map(helpers.map((h) => [h.name, h.providers]))
    const apps = readdirSync(TEMPLATES_DIR).sort()
    let usages = 0
    let rateLimitCallers = 0
    const problems: string[] = []

    for (const app of apps) {
      const apiDir = join(TEMPLATES_DIR, app, 'api')
      const code = stripComments(tsSources(join(apiDir, 'src')))
      if (code.length === 0) continue
      let manifest: { dependencies?: Record<string, string> }
      try {
        manifest = JSON.parse(readFileSync(join(apiDir, 'package.json'), 'utf-8')) as {
          dependencies?: Record<string, string>
        }
      } catch (error) {
        problems.push(
          `${app}: api/package.json is missing or unparseable (${error instanceof Error ? error.message : String(error)})`,
        )
        continue
      }
      for (const [name, providers] of providersOf) {
        if (!code.includes(`${name}(`)) continue
        usages++
        if (name === 'setupRateLimitMemory') rateLimitCallers++
        for (const provider of unbackedProviders(manifest, providers)) {
          problems.push(
            `${app}: ${name}() lazily imports ${provider}, which api/package.json ` +
              `does not declare in production dependencies — a --omit=dev deploy ` +
              `crash-loops on ERR_MODULE_NOT_FOUND at boot`,
          )
        }
      }
    }

    // Non-vacuousness: the scan must have matched the fleet it exists to guard
    // (2026-10-08's sweep measured 150 setupRateLimitMemory callers and fixed
    // 155 manifests), and found no hole.
    expect(usages).toBeGreaterThanOrEqual(400)
    expect(rateLimitCallers).toBeGreaterThanOrEqual(100)
    expect(problems).toEqual([])
  })
})
