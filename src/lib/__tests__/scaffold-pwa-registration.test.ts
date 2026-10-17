/**
 * The generated `src/pwa.ts` must BE `@molecule/app-pwa-default`, never a copy
 * of it.
 *
 * The service-worker registration is written into every app scaffold, and it
 * used to be an inline copy of `registerPWA()` held in
 * `templates/app/shared/pwa.ts.tpl`. That copy missed the first-claim guard
 * (`hadController` — a page with no worker yet is CLAIMED on its first visit
 * when the worker activates, and reloading on that `controllerchange` aborted
 * whatever navigation was in flight, so every fresh browser context — every
 * end-to-end run — saw pages reload under it). The fix landed in the package
 * (molecule `bdea8c2a4`) and could not reach the scaffold, because the
 * scaffold owned a duplicate.
 *
 * These tests pin the ONE implementation: the template re-exports the package,
 * the registry makes the package `alwaysInclude` so every generated app's
 * `package.json` actually carries it, every flagship template's `pwa.ts` is the
 * same re-export, and a static site (no service worker) still excludes it.
 *
 * @module
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { isStaticExcluded } from '../../commands/create.js'
import { getMoleculeVersion, loadAppFrameworks, loadRegistry } from '../registry.js'
import { getTemplateRequiredPackages } from '../scaffold.js'
import type { InferredPackage } from '../schema.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates')
const PACKAGE_NAME = '@molecule/app-pwa-default'
const RE_EXPORT = `export { registerPWA } from '${PACKAGE_NAME}'\n`

/** Flagship template slugs under `templates/apps/`. */
async function flagshipSlugs(): Promise<string[]> {
  const entries = await readdir(join(TEMPLATES, 'apps'), { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

describe('the scaffolded pwa.ts is @molecule/app-pwa-default, not a copy', () => {
  it('the shared app template re-exports the package instead of implementing it', async () => {
    const template = await readFile(join(TEMPLATES, 'app', 'shared', 'pwa.ts.tpl'), 'utf-8')
    expect(template).toBe(RE_EXPORT)
    // The inline copy's tells — any of these coming back means a second
    // implementation exists again and the next package fix will miss it.
    expect(template).not.toContain('virtual:pwa-register')
    expect(template).not.toContain('controllerchange')
    expect(template).not.toContain('addEventListener')
  })

  it('every framework whose scaffold writes src/pwa.ts requires the package', () => {
    const registry = loadRegistry('app')
    const frameworks = loadAppFrameworks()
    function frameworkPackage(framework: string): InferredPackage | undefined {
      return registry.find(
        (pkg) =>
          pkg.molecule?.type === 'framework' &&
          pkg.molecule?.category === 'framework' &&
          pkg.molecule?.framework === framework,
      )
    }

    // The template that writes `src/pwa.ts` belongs to these frameworks. The
    // dependency has to reach the generated `package.json` for an explicit
    // `--packages` list as well as the interactive menu, which is what
    // `templateRequires` is for.
    const writesPwa = ['react', 'react-native-web', 'vue', 'svelte', 'solid', 'angular']
    for (const framework of writesPwa) {
      const required = getTemplateRequiredPackages(
        framework,
        frameworkPackage(framework),
        frameworks[framework],
      )
      expect(required, `${framework} scaffold must require ${PACKAGE_NAME}`).toContain(PACKAGE_NAME)
    }

    // React Native ships no service worker and no `src/pwa.ts` — pulling vite
    // tooling into its dependency tree would be wrong.
    const rnRequired = getTemplateRequiredPackages(
      'react-native',
      frameworkPackage('react-native'),
      frameworks['react-native'],
    )
    expect(rnRequired).not.toContain(PACKAGE_NAME)
  })

  it('every flagship template app uses the same re-export and declares the dependency', async () => {
    const expectedVersion = getMoleculeVersion(PACKAGE_NAME)
    const slugs = await flagshipSlugs()
    expect(slugs.length).toBeGreaterThan(0)

    const wrong: string[] = []
    for (const slug of slugs) {
      const appDir = join(TEMPLATES, 'apps', slug, 'app')
      const manifest = JSON.parse(await readFile(join(appDir, 'package.json'), 'utf-8')) as {
        dependencies?: Record<string, string>
      }
      const pwaPath = join(appDir, 'src', 'pwa.ts')
      const pwa = await readFile(pwaPath, 'utf-8').catch(() => undefined)

      // A static-site template is prerendered plain files — no service worker,
      // no registration, and no dependency on the registration packet.
      if (pwa === undefined) {
        if (manifest.dependencies?.[PACKAGE_NAME] !== undefined) {
          wrong.push(`${slug}: static template declares ${PACKAGE_NAME} but has no src/pwa.ts`)
        }
        continue
      }

      if (pwa !== RE_EXPORT) wrong.push(`${slug}: src/pwa.ts is not the package re-export`)
      if (manifest.dependencies?.[PACKAGE_NAME] !== expectedVersion) {
        wrong.push(
          `${slug}: package.json pins ${manifest.dependencies?.[PACKAGE_NAME] ?? '(none)'}, registry has ${expectedVersion}`,
        )
      }
    }
    expect(wrong).toEqual([])
  })

  it('a static site does not ship the PWA registration packet', () => {
    const registry = loadRegistry()
    const pwa = registry.find((pkg) => pkg.name === PACKAGE_NAME)
    expect(isStaticExcluded(pwa)).toBe(true)
    // The predicate must stay narrow — it is fed every selected package.
    expect(
      isStaticExcluded(registry.find((pkg) => pkg.name === '@molecule/app-state-zustand')),
    ).toBe(false)
  })
})
