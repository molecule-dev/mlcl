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
 * same re-export, and a static site still excludes it. The build must keep the
 * worker active after a replacement entry drops the package call.
 *
 * @module
 */

import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import type { Server } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { chromium, type Page } from '@playwright/test'
import { build, createServer, preview } from 'vite'
import { describe, expect, it, vi } from 'vitest'

import { isStaticExcluded } from '../../commands/create.js'
import { getMoleculeVersion, loadAppFrameworks, loadRegistry } from '../registry.js'
import { createAppProject, getTemplateRequiredPackages } from '../scaffold.js'
import type { InferredPackage } from '../schema.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const TEMPLATES = join(ROOT, 'templates')
const PACKAGE_NAME = '@molecule/app-pwa-default'
const RE_EXPORT = `export { registerPWA } from '${PACKAGE_NAME}'\n`
const require = createRequire(import.meta.url)

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

  it('the web scaffolds leave registration to the build and keep VitePWA auto-registration off', async () => {
    const vite = await readFile(join(TEMPLATES, 'app', 'shared', 'vite.config.ts.tpl'), 'utf-8')
    expect(vite).toContain('injectRegister: false as const')
    for (const entry of [
      'react/bootstrap.tsx.tpl',
      'react/main.tsx.tpl',
      'react-native-web/main.tsx.tpl',
      'vue/main.ts.tpl',
      'solid/main.tsx.tpl',
      'angular/main.ts.tpl',
      'svelte/hooks.client.ts.tpl',
    ]) {
      const startup = await readFile(join(TEMPLATES, 'app', entry), 'utf-8')
      expect(startup, entry).not.toContain('registerPWA')
    }
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

describe('generated app service workers', { timeout: 90_000 }, () => {
  async function withApp(
    check: (root: string, page: Page) => Promise<void>,
    { legacy = false, pwa = true } = {},
  ): Promise<void> {
    const root = await mkdtemp(join(tmpdir(), 'scaffold-pwa-'))
    try {
      await createAppProject(root, 'equipment-console', 'react')
      await symlink(
        dirname(dirname(require.resolve('vite/package.json'))),
        join(root, 'node_modules'),
      )
      await writeFile(
        join(root, 'src/bootstrap.tsx'),
        (legacy ? "import { registerPWA } from './pwa.js'; registerPWA();\n" : '') +
          "document.querySelector('#root')!.textContent = 'Equipment console'\n",
      )
      if (!pwa) {
        const config = join(root, 'vite.config.ts')
        await writeFile(config, (await readFile(config, 'utf8')).replace(/\bpwaPlugins,\s*/, ''))
      }
      const browser = await chromium.launch()
      try {
        const page = await browser.newPage()
        await check(root, page)
      } finally {
        await browser.close()
      }
    } finally {
      // A dev server can still be writing its cache as it closes: rm retries ENOTEMPTY.
      await rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  }

  function origin(server: Server | null): string {
    const address = server?.address()
    if (!address || typeof address === 'string') throw new Error('Expected a loopback TCP listener')
    return `http://127.0.0.1:${address.port}`
  }

  async function withPreview(root: string, check: (url: string) => Promise<void>): Promise<void> {
    // Vite inherits Vitest's NODE_ENV=test even when building for preview.
    vi.stubEnv('NODE_ENV', 'production')
    try {
      await build({ root, configLoader: 'runner', logLevel: 'silent' })
    } finally {
      vi.unstubAllEnvs()
    }
    const server = await preview({
      root,
      configLoader: 'runner',
      logLevel: 'silent',
      preview: { host: '127.0.0.1', port: 0, open: false },
      plugins: [
        {
          name: 'test-api',
          configurePreviewServer(previewServer) {
            previewServer.middlewares.use((req, res, next) => {
              if (!req.url?.startsWith('/api/') && req.url !== '/health') return next()
              res.end(`API ${req.url}`)
            })
          },
        },
      ],
    })
    try {
      await check(origin(server.httpServer))
    } finally {
      await server.close()
    }
  }

  async function expectWorkerControl(page: Page): Promise<void> {
    await expect
      .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 20_000 })
      .toBe(true)
  }

  it('serves the next document from the worker after the entry is replaced', async () => {
    await withApp((root, page) =>
      withPreview(root, async (url) => {
        const navigations: string[] = []
        page.on('framenavigated', (frame) => navigations.push(frame.url()))
        await page.goto(url)
        await expectWorkerControl(page)
        expect(navigations).toEqual([`${url}/`])
        const response = await page.goto(`${url}/equipment/calibration`)
        expect(response?.fromServiceWorker()).toBe(true)
        expect(await page.locator('#root').textContent()).toBe('Equipment console')
      }),
    )
  })

  it('installs an offline shell without precaching the Apple launch images', async () => {
    await withApp(async (root, page) => {
      await writeFile(join(root, 'public/icons/splash-legend.svg'), '<svg/>')
      await withPreview(root, async (url) => {
        await page.goto(url)
        await expectWorkerControl(page)
        const cachedPaths = await page.evaluate(async () => {
          const keys = await Promise.all(
            (await caches.keys()).map(async (name) => (await caches.open(name)).keys()),
          )
          return keys.flat().map((entry) => new URL(entry.url).pathname)
        })
        expect(cachedPaths).toEqual(
          expect.arrayContaining([
            '/index.html',
            '/icons/icon-192.svg',
            '/icons/splash-legend.svg',
          ]),
        )
        expect(cachedPaths.filter((path) => /^\/icons\/splash-\d+x\d+\.svg$/.test(path))).toEqual(
          [],
        )
        const splash = '/icons/splash-640x1136.svg'
        expect(
          await page.locator(`link[rel="apple-touch-startup-image"][href="${splash}"]`).count(),
        ).toBe(1)
        const launchImage = await page.request.get(url + splash)
        expect(launchImage.headers()['content-type']).toContain('image/svg+xml')
        expect(await launchImage.text()).toContain('<svg')
        await page.context().setOffline(true)
        const response = await page.goto(`${url}/equipment/calibration`)
        expect(response?.fromServiceWorker()).toBe(true)
        expect(await page.locator('#root').textContent()).toBe('Equipment console')
      })
    })
  })

  it('passes OAuth and health navigations through while the app shell stays cached', async () => {
    await withApp(
      (root, page) =>
        withPreview(root, async (url) => {
          await page.goto(url)
          await expectWorkerControl(page)
          for (const route of [
            '/api/users/oauth/github?returnTo=%2F',
            '/api/users/log-in/oauth',
            '/health',
          ]) {
            const response = await page.goto(url + route)
            expect(response?.fromServiceWorker(), route).toBe(false)
            expect(await response?.text()).toBe(`API ${route}`)
          }
          const shell = await page.goto(`${url}/apiculture`)
          expect(shell?.fromServiceWorker()).toBe(true)
        }),
      { legacy: true },
    )
  })

  it('builds and serves a page without registering when VitePWA is removed', async () => {
    await withApp(
      (root, page) =>
        withPreview(root, async (url) => {
          await page.goto(url)
          expect(await page.locator('#root').textContent()).toBe('Equipment console')
          expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations())).toEqual([])
          await expect(readFile(join(root, 'dist/sw.js'))).rejects.toMatchObject({ code: 'ENOENT' })
        }),
      { pwa: false },
    )
  })

  it('serves live edits without installing a worker in Vite dev', async () => {
    await withApp(async (root, page) => {
      const server = await createServer({
        root,
        configLoader: 'runner',
        logLevel: 'silent',
        cacheDir: join(root, '.vite'),
        server: { host: '127.0.0.1', port: 0, open: false },
      })
      try {
        await server.listen()
        await page.goto(origin(server.httpServer))
        expect(await page.locator('#root').textContent()).toBe('Equipment console')
        await writeFile(
          join(root, 'src/bootstrap.tsx'),
          "document.querySelector('#root')!.textContent = 'Edited console'\n",
        )
        await page.reload()
        expect(await page.locator('#root').textContent()).toBe('Edited console')
        expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations())).toEqual([])
      } finally {
        await server.close()
      }
    })
  })
})
