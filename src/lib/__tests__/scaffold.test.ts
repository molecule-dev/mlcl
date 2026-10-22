/* eslint-disable @typescript-eslint/no-explicit-any */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getMoleculeVersion, loadRegistry, loadToolchain } from '../registry.js'
import {
  addPackages,
  buildExtraUiSourceScans,
  collectNpmOverrides,
  ensureE2EManifest,
  ensureScratchDir,
  generateEnvFile,
  generateFontHtml,
  getTemplateRequiredPackages,
  processTemplate,
  resolvePackageDirectory,
  stampDemoContentNotices,
} from '../scaffold.js'
import type { InferredPackage, MoleculeSecret } from '../schema.js'

const MLCL_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

describe('scaffold', () => {
  describe('processTemplate', () => {
    it('should replace {{KEY}} placeholders', () => {
      const result = processTemplate('Hello {{NAME}}!', { NAME: 'World' })
      expect(result).toBe('Hello World!')
    })

    it('should replace multiple occurrences of the same key', () => {
      const result = processTemplate('{{A}} and {{A}}', { A: 'x' })
      expect(result).toBe('x and x')
    })

    it('should replace multiple different keys', () => {
      const result = processTemplate('{{FIRST}} {{LAST}}', { FIRST: 'John', LAST: 'Doe' })
      expect(result).toBe('John Doe')
    })

    it('should leave unmatched placeholders intact', () => {
      const result = processTemplate('Hello {{NAME}}, {{MISSING}}!', { NAME: 'World' })
      expect(result).toBe('Hello World, {{MISSING}}!')
    })

    it('should handle empty content', () => {
      const result = processTemplate('', { KEY: 'value' })
      expect(result).toBe('')
    })

    it('should handle empty vars', () => {
      const result = processTemplate('No vars here', {})
      expect(result).toBe('No vars here')
    })

    it('should handle empty string replacement', () => {
      const result = processTemplate('Before{{KEY}}After', { KEY: '' })
      expect(result).toBe('BeforeAfter')
    })
  })

  describe('resolvePackageDirectory', () => {
    const root = '/monorepo'

    it('should resolve core package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'api-database',
        type: 'core',
        stack: 'api',
        category: 'database',
      })
      expect(result).toBe(join(root, 'packages', 'api', 'core', 'database'))
    })

    it('should resolve provider/bond package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'api-cache-redis',
        type: 'provider',
        stack: 'api',
        category: 'cache',
      })
      expect(result).toBe(join(root, 'packages', 'api', 'bonds', 'cache', 'redis'))
    })

    it('should resolve resource package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'api-resource-project',
        type: 'resource',
        stack: 'api',
        category: 'project',
      })
      expect(result).toBe(join(root, 'packages', 'api', 'resources', 'project'))
    })

    it('should resolve middleware package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'api-middleware-auth',
        type: 'middleware',
        stack: 'api',
        category: 'auth',
      })
      expect(result).toBe(join(root, 'packages', 'api', 'middleware', 'auth'))
    })

    it('should resolve utility package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'api-utilities-validation',
        type: 'utility',
        stack: 'api',
        category: 'validation',
      })
      expect(result).toBe(join(root, 'packages', 'api', 'utilities', 'validation'))
    })

    it('should resolve infrastructure package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'api-ci',
        type: 'infrastructure',
        stack: 'api',
        category: 'ci',
      })
      expect(result).toBe(join(root, 'packages', 'api', 'infrastructure', 'ci'))
    })

    it('should resolve framework package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'app-react',
        type: 'framework',
        stack: 'app',
        category: 'react',
      })
      expect(result).toBe(join(root, 'packages', 'app', 'frameworks', 'react'))
    })

    it('should resolve feature package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'app-ide-react',
        type: 'feature',
        stack: 'app',
        category: 'ide',
      })
      expect(result).toBe(join(root, 'packages', 'app', 'features', 'ide-react'))
    })

    it('should resolve native package', () => {
      const result = resolvePackageDirectory(root, {
        name: 'app-push',
        type: 'native',
        stack: 'app',
        category: 'push',
      })
      expect(result).toBe(join(root, 'packages', 'app', 'native', 'push'))
    })

    it('should throw for unknown type', () => {
      expect(() =>
        resolvePackageDirectory(root, {
          name: 'unknown',
          type: 'bogus' as any,
          stack: 'api',
          category: 'test',
        }),
      ).toThrow('Unknown package type')
    })

    it('should use explicit providerName if provided', () => {
      const result = resolvePackageDirectory(root, {
        name: 'app-code-editor-monaco',
        type: 'provider',
        stack: 'app',
        category: 'code-editor',
        providerName: 'monaco',
      })
      expect(result).toBe(join(root, 'packages', 'app', 'bonds', 'code-editor', 'monaco'))
    })
  })

  describe('generateFontHtml', () => {
    it('should return empty for system fonts', () => {
      const packages: InferredPackage[] = [
        {
          name: '@molecule/app-fonts-system',
          version: '1.0.0',
          type: 'core' as any,
          dependencies: {},
          peerDependencies: {},
          routes: [],
          tables: [],
          exports: [],
          path: '/fake',
          molecule: {
            category: 'fonts',
            type: 'provider',
            font: { family: 'system-ui', source: 'system' },
          } as any,
        },
      ]

      const result = generateFontHtml(['@molecule/app-fonts-system'], packages)
      expect(result.html).toBe('')
      expect(result.fontFiles).toHaveLength(0)
    })

    it('should generate CDN link tags', () => {
      const packages: InferredPackage[] = [
        {
          name: '@molecule/app-fonts-roboto',
          version: '1.0.0',
          type: 'core' as any,
          dependencies: {},
          peerDependencies: {},
          routes: [],
          tables: [],
          exports: [],
          path: '/fake',
          molecule: {
            category: 'fonts',
            type: 'provider',
            font: {
              family: 'Roboto',
              source: 'cdn',
              url: 'https://fonts.googleapis.com/css2?family=Roboto',
              preconnect: ['https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
            },
          } as any,
        },
      ]

      const result = generateFontHtml(['@molecule/app-fonts-roboto'], packages)
      expect(result.html).toContain('fonts.googleapis.com')
      expect(result.html).toContain('preconnect')
      expect(result.html).toContain('crossorigin')
      expect(result.html).toContain('rel="stylesheet"')
      expect(result.fontFiles).toHaveLength(0)
    })

    it('should generate local font @font-face declarations', () => {
      const packages: InferredPackage[] = [
        {
          name: '@molecule/app-fonts-inter',
          version: '1.0.0',
          type: 'core' as any,
          dependencies: {},
          peerDependencies: {},
          routes: [],
          tables: [],
          exports: [],
          path: '/fake',
          molecule: {
            category: 'fonts',
            type: 'provider',
            font: {
              family: 'Inter',
              source: 'local',
              fontsDir: 'fonts',
              faces: [
                { file: 'Inter-Regular.woff2', weight: 400, style: 'normal' },
                { file: 'Inter-Bold.woff2', weight: 700, style: 'normal' },
              ],
            },
          } as any,
        },
      ]

      const result = generateFontHtml(['@molecule/app-fonts-inter'], packages)
      expect(result.html).toContain('@font-face')
      expect(result.html).toContain("font-family: 'Inter'")
      expect(result.html).toContain('font-weight: 400')
      expect(result.html).toContain('font-weight: 700')
      expect(result.html).toContain("format('woff2')")
      expect(result.fontFiles).toHaveLength(2)
      expect(result.fontFiles[0].file).toBe('Inter-Regular.woff2')
    })

    it('should handle variable fonts with @supports block', () => {
      const packages: InferredPackage[] = [
        {
          name: '@molecule/app-fonts-inter',
          version: '1.0.0',
          type: 'core' as any,
          dependencies: {},
          peerDependencies: {},
          routes: [],
          tables: [],
          exports: [],
          path: '/fake',
          molecule: {
            category: 'fonts',
            type: 'provider',
            font: {
              family: 'Inter',
              source: 'local',
              faces: [{ file: 'Inter-Variable.woff2', weight: '100 900' as any, variable: true }],
            },
          } as any,
        },
      ]

      const result = generateFontHtml(['@molecule/app-fonts-inter'], packages)
      expect(result.html).toContain('@supports (font-variation-settings: normal)')
      expect(result.html).toContain('VariableFont')
    })

    it('should return empty for no font packages', () => {
      const result = generateFontHtml([], [])
      expect(result.html).toBe('')
      expect(result.fontFiles).toHaveLength(0)
    })
  })

  // Regression: ws DoS CVE (GHSA-96hv-2xvq-fx4p, CWE-400/770) — a generated
  // realtime app that wires the socket.io bond must pin a patched `ws` at its
  // install ROOT. npm honors `overrides` only from the root, never from a nested
  // dependency, so the bond's own package.json cannot fix the transitive `ws`
  // pulled by socket.io/engine.io. The fix declares `molecule.npmOverrides` on
  // the socket.io bonds in the registry and merges them into the project root.
  describe('collectNpmOverrides (ws CVE X1-3)', () => {
    const socketioBond: InferredPackage = {
      name: '@molecule/api-realtime-socketio',
      version: '1.0.0',
      type: 'provider' as any,
      dependencies: { 'socket.io': '4.8.3' },
      peerDependencies: {},
      routes: [],
      tables: [],
      exports: [],
      path: '/fake/socketio',
      molecule: {
        category: 'realtime',
        type: 'provider',
        npmOverrides: { ws: '8.21.1' },
      } as any,
    }
    const plainPkg: InferredPackage = {
      name: '@molecule/api-resource-user',
      version: '1.0.0',
      type: 'resource' as any,
      dependencies: {},
      peerDependencies: {},
      routes: [],
      tables: [],
      exports: [],
      path: '/fake/user',
      molecule: { category: 'resource', type: 'resource' } as any,
    }

    it('pins patched ws when the socket.io realtime bond is selected (exploit blocked)', () => {
      const result = collectNpmOverrides(
        ['@molecule/api-realtime-socketio', '@molecule/api-resource-user'],
        [socketioBond, plainPkg],
      )
      expect(result).toEqual({ ws: '8.21.1' })
    })

    it('returns no overrides for a non-realtime app (legitimate behavior preserved)', () => {
      const result = collectNpmOverrides(['@molecule/api-resource-user'], [socketioBond, plainPkg])
      expect(result).toEqual({})
    })

    it('ignores a package that declares overrides but is not selected', () => {
      // Bond present in registry but NOT chosen → its override must not leak in.
      const result = collectNpmOverrides(['@molecule/api-resource-user'], [socketioBond, plainPkg])
      expect(result.ws).toBeUndefined()
    })

    it('uses an exact pin (no range), honoring save-exact policy', () => {
      const result = collectNpmOverrides(['@molecule/api-realtime-socketio'], [socketioBond])
      expect(result.ws).toMatch(/^\d+\.\d+\.\d+$/)
    })

    it('the real registry carries the ws pin on every socket.io bond', () => {
      const all = loadRegistry()
      for (const name of ['@molecule/api-realtime-socketio', '@molecule/app-realtime-socketio']) {
        const pkg = all.find((p) => p.name === name)
        expect(pkg, `${name} missing from registry`).toBeDefined()
        expect(pkg!.molecule?.npmOverrides?.ws).toBe('8.21.1')
      }
      // End-to-end: selecting the bond through the real registry produces the pin.
      expect(collectNpmOverrides(['@molecule/api-realtime-socketio'], all)).toEqual({
        ws: '8.21.1',
      })
    })

    it('every flagship template wiring a socket.io realtime bond pins ws at its root', () => {
      const appsDir = join(MLCL_ROOT, 'templates', 'apps')
      const apps = readdirSync(appsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name)

      let checked = 0
      for (const app of apps) {
        const templateJsonPath = join(appsDir, app, 'template.json')
        const rootPkgPath = join(appsDir, app, 'package.json')
        if (!existsSync(templateJsonPath) || !existsSync(rootPkgPath)) continue
        const wiresSocketio = readFileSync(templateJsonPath, 'utf8').includes('realtime-socketio')
        if (!wiresSocketio) continue
        checked++
        const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf8'))
        expect(pkg.overrides?.ws, `${app} root package.json missing ws override`).toBe('8.21.1')
      }
      // Guard: the sweep actually found socket.io templates (not a no-op pass).
      expect(checked).toBeGreaterThan(0)
    })
  })

  // Regression: adopting the @molecule/app-ui-tailwind-glass ClassMap variant bond
  // yielded zero blur because its glass/backdrop-filter utility classes live ONLY
  // in its own dist, which the scaffolded index.css never @source-scanned (Tailwind
  // 4 only generates classes it finds via a scan). The scaffolder must emit the
  // glass-dist @source line when — and only when — that bond is selected.
  describe('buildExtraUiSourceScans (glass ClassMap @source scan)', () => {
    it('emits the glass-dist @source line when the glass bond is selected', () => {
      const result = buildExtraUiSourceScans(['@molecule/app-ui-tailwind-glass'], '../..')
      expect(result).toBe('\n@source "../../node_modules/@molecule/app-ui-tailwind-glass/dist";')
    })

    it('emits nothing when the glass bond is NOT selected (byte-identical output)', () => {
      const result = buildExtraUiSourceScans(
        ['@molecule/app-ui-tailwind', '@molecule/app-styling-tailwind', '@molecule/app-ui-react'],
        '../..',
      )
      expect(result).toBe('')
    })

    it('matches the exact relative-path + /dist glob shape of the static scans', () => {
      // Same nmPrefix the template's static @source lines use → the glass scan
      // resolves alongside them, not to a different depth.
      const result = buildExtraUiSourceScans(['@molecule/app-ui-tailwind-glass'], '../../..')
      expect(result).toContain(
        '@source "../../../node_modules/@molecule/app-ui-tailwind-glass/dist"',
      )
      expect(result).not.toMatch(/\/dist\/[^"]/) // scans the dir, no trailing glob junk
    })

    it('lands the glass @source line in the rendered CSS template only when selected', () => {
      const tpl = readFileSync(
        join(MLCL_ROOT, 'templates', 'app', 'shared', 'index-tailwind.css.tpl'),
        'utf8',
      )
      const render = (selected: string[]): string =>
        processTemplate(tpl, {
          NM_PREFIX: '../..',
          FRAMEWORK: 'react',
          EXTRA_UI_SOURCE_SCANS: buildExtraUiSourceScans(selected, '../..'),
        })

      const withGlass = render(['@molecule/app-ui-react', '@molecule/app-ui-tailwind-glass'])
      const withoutGlass = render(['@molecule/app-ui-react'])

      // The baseline framework/tailwind scans are present regardless.
      for (const css of [withGlass, withoutGlass]) {
        expect(css).toContain('@source "../../node_modules/@molecule/app-ui-tailwind/dist"')
        expect(css).toContain('@source "../../node_modules/@molecule/app-ui-react/dist"')
        // Placeholder must be fully substituted — no literal token left behind.
        expect(css).not.toContain('{{EXTRA_UI_SOURCE_SCANS}}')
      }

      const glassScanLine = '@source "../../node_modules/@molecule/app-ui-tailwind-glass/dist";'
      // Must be a STANDALONE @source directive on its own line — NOT swallowed into
      // a `/* ... */` comment (Tailwind would then never scan it and the blur bond
      // stays dead). Assert the trimmed line exists exactly.
      const withGlassLines = withGlass.split('\n').map((l) => l.trim())
      expect(withGlassLines).toContain(glassScanLine)
      // Sanity: the glass scan sits immediately after the framework scan line.
      const fwLine = '@source "../../node_modules/@molecule/app-ui-react/dist";'
      expect(withGlassLines.indexOf(glassScanLine)).toBe(withGlassLines.indexOf(fwLine) + 1)
      // Only the illustrative template comment may mention the bond — never a scan line.
      expect(withoutGlass.split('\n').map((l) => l.trim())).not.toContain(glassScanLine)
    })
  })

  describe('generateEnvFile', () => {
    let tempDir: string

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'mlcl-test-env-'))
    })

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    it('should generate API .env with defaults', async () => {
      await generateEnvFile(tempDir, [], 'api')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      expect(content).toContain('PORT=4000')
      expect(content).toContain('NODE_ENV=development')
    })

    it('should generate App .env with defaults', async () => {
      await generateEnvFile(tempDir, [], 'app')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      // VITE_API_URL is intentionally empty so the frontend uses
      // same-origin requests via Vite's dev proxy. See scaffold.ts for
      // the rationale (LAN / Tailscale / phone access).
      expect(content).toContain('VITE_API_URL=\n')
      // VITE_APP_NAME is intentionally NOT emitted: it was never read anywhere
      // (branding.ts APP_NAME is the app-name source), so it was a dead env var
      // that looked like the rename knob. See branding.ts / theme.css headers.
      expect(content).not.toContain('VITE_APP_NAME')
    })

    it('should include secrets from packages', async () => {
      const secrets: MoleculeSecret[] = [
        { name: 'DATABASE_URL', required: true },
        { name: 'JWT_SECRET', required: true, default: 'change-me' },
      ]
      await generateEnvFile(tempDir, secrets, 'api')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      expect(content).toContain('DATABASE_URL=')
      expect(content).toContain('JWT_SECRET=change-me')
    })

    it('should deduplicate secrets', async () => {
      const secrets: MoleculeSecret[] = [{ name: 'PORT', required: true, default: '3000' }]
      await generateEnvFile(tempDir, secrets, 'api')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      // PORT should appear exactly once (from defaults, not from secrets)
      const matches = content.match(/^PORT=/gm)
      expect(matches).toHaveLength(1)
    })

    it('should render setup guidance comments from registry metadata', async () => {
      const secrets: MoleculeSecret[] = [
        {
          name: 'STRIPE_SECRET_KEY',
          required: true,
          label: 'Stripe secret key',
          setupUrl: 'https://dashboard.stripe.com/apikeys',
          instructions: 'Stripe Dashboard → Developers → API keys.',
          example: 'sk_test_...',
        },
      ]
      await generateEnvFile(tempDir, secrets, 'api')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      expect(content).toContain('# Stripe secret key — Stripe Dashboard → Developers → API keys.')
      expect(content).toContain('# Get it here: https://dashboard.stripe.com/apikeys')
      expect(content).toContain('# Example: sk_test_...')
      expect(content).toContain('STRIPE_SECRET_KEY=\n')
    })

    it('should mark optional secrets and omit the example when a default exists', async () => {
      const secrets: MoleculeSecret[] = [
        {
          name: 'POSTHOG_HOST',
          required: false,
          label: 'PostHog host',
          instructions: 'Origin of your PostHog instance.',
          example: 'https://us.i.posthog.com',
          default: 'https://us.i.posthog.com',
        },
      ]
      await generateEnvFile(tempDir, secrets, 'api')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      expect(content).toContain('# PostHog host (optional) — Origin of your PostHog instance.')
      expect(content).toContain('POSTHOG_HOST=https://us.i.posthog.com')
      expect(content).not.toContain('# Example:')
    })

    it('tightens an existing .env to owner-only instead of leaving its old mode', async () => {
      // `writeFile(path, data, { mode })` applies `mode` only when the file is
      // CREATED — an `.env` that already exists keeps whatever permissions it
      // had. Reachable on `mlcl create --force` over a directory whose `.env`
      // came from a checkout or a manual edit; the write then puts FRESH
      // generated credentials (the JWT private key PEM, the VAPID keypair) into
      // a group/other-readable file. The scaffold must end with the same
      // owner-only guarantee the append path gives (env-file.ts writes AND
      // chmods).
      const dir = await mkdtemp(join(tmpdir(), 'mlcl-test-env-mode-'))
      try {
        const envPath = join(dir, '.env')
        await writeFile(envPath, 'PRE_EXISTING=1\n')
        await chmod(envPath, 0o644)
        expect(statSync(envPath).mode & 0o777).toBe(0o644)

        const secrets: MoleculeSecret[] = [
          { name: 'ENCRYPTION_KEY', required: true, generate: 'random-hex-32' },
        ]
        await generateEnvFile(dir, secrets, 'api')

        expect(await readFile(envPath, 'utf-8')).toMatch(/^ENCRYPTION_KEY=[0-9a-f]{64}$/m)
        expect(statSync(envPath).mode & 0o777).toBe(0o600)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    it('should auto-generate generatable secrets with real values', async () => {
      const secrets: MoleculeSecret[] = [
        { name: 'ENCRYPTION_KEY', required: true, generate: 'random-hex-32' },
        { name: 'VAPID_PUBLIC_KEY', required: true, generate: 'vapid-public' },
        { name: 'VAPID_PRIVATE_KEY', required: true, generate: 'vapid-private' },
        { name: 'JWT_PRIVATE_KEY', required: true, generate: 'rsa-keypair-private' },
        { name: 'JWT_PUBLIC_KEY', required: true, generate: 'rsa-keypair-public' },
      ]
      await generateEnvFile(tempDir, secrets, 'api')
      const content = await readFile(join(tempDir, '.env'), 'utf-8')

      expect(content).toMatch(/^ENCRYPTION_KEY=[0-9a-f]{64}$/m)
      expect(content).toMatch(/^VAPID_PUBLIC_KEY=[A-Za-z0-9_-]{80,}$/m)
      expect(content).toMatch(/^VAPID_PRIVATE_KEY=[A-Za-z0-9_-]{40,}$/m)
      // PEM values are single-line with literal \n escapes (normalizePem-compatible)
      expect(content).toMatch(/^JWT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n/m)
      expect(content).toMatch(/^JWT_PUBLIC_KEY=-----BEGIN PUBLIC KEY-----\\n/m)
      expect(content).toContain('# Auto-generated by mlcl create — no setup needed.')
      // Generated secrets never render a setup URL prompt
      expect(content.split('ENCRYPTION_KEY=')[0]).not.toContain('# Get it here:')
    })
  })

  describe('addPackages', () => {
    let tempDir: string

    beforeAll(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'mlcl-test-add-'))
    })

    afterAll(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    it('should add packages to dependencies', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: {} }, null, 2),
      )

      await addPackages(tempDir, ['@molecule/api-database', '@molecule/api-logger'])
      const pkg = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'))

      // Registry is the source of truth, not a literal — a fleet version bump
      // must not break these the way 1.0.0 -> 1.0.1 did.
      expect(pkg.dependencies['@molecule/api-database']).toBe(
        getMoleculeVersion('@molecule/api-database'),
      )
      expect(pkg.dependencies['@molecule/api-logger']).toBe(
        getMoleculeVersion('@molecule/api-logger'),
      )
    })

    it('should pin each @molecule package to the EXACT registry version (no range)', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: {} }, null, 2),
      )

      await addPackages(tempDir, ['@molecule/api-database', '@molecule/app-ui'])
      const pkg = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'))

      // Source of truth is registry.json's moleculeVersions, not a hardcoded literal.
      expect(pkg.dependencies['@molecule/api-database']).toBe(
        getMoleculeVersion('@molecule/api-database'),
      )
      expect(pkg.dependencies['@molecule/app-ui']).toBe(getMoleculeVersion('@molecule/app-ui'))
      // Exact pins only — never a caret/tilde range.
      expect(pkg.dependencies['@molecule/api-database']).not.toMatch(/^[\^~]/)
      expect(pkg.dependencies['@molecule/app-ui']).not.toMatch(/^[\^~]/)
    })

    it('should sort dependencies alphabetically', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: { 'z-pkg': '1.0.0' } }, null, 2),
      )

      await addPackages(tempDir, ['@molecule/a-first'])
      const pkg = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'))
      const keys = Object.keys(pkg.dependencies)

      expect(keys[0]).toBe('@molecule/a-first')
      expect(keys[1]).toBe('z-pkg')
    })

    it('should use version overrides when provided', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test', dependencies: {} }, null, 2),
      )

      await addPackages(tempDir, ['@molecule/api-database'], {
        '@molecule/api-database': 'file:../molecule/packages/api/core/database',
      })
      const pkg = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'))

      expect(pkg.dependencies['@molecule/api-database']).toBe(
        'file:../molecule/packages/api/core/database',
      )
    })

    it('should create dependencies object if missing', async () => {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }, null, 2))

      await addPackages(tempDir, ['@molecule/test-pkg'])
      const pkg = JSON.parse(await readFile(join(tempDir, 'package.json'), 'utf-8'))

      expect(pkg.dependencies['@molecule/test-pkg']).toBe(getMoleculeVersion('@molecule/test-pkg'))
    })
  })

  describe('getTemplateRequiredPackages', () => {
    it('should return templateRequires from package metadata', () => {
      const result = getTemplateRequiredPackages('react', {
        molecule: { templateRequires: ['@molecule/app-i18n', '@molecule/app-theme'] },
      })
      expect(result).toEqual(['@molecule/app-i18n', '@molecule/app-theme'])
    })

    it('should return empty array when no metadata', () => {
      const result = getTemplateRequiredPackages('react')
      expect(result).toEqual([])
    })

    it('should return empty array when templateRequires not set', () => {
      const result = getTemplateRequiredPackages('react', { molecule: {} })
      expect(result).toEqual([])
    })

    it('should fall back to appFrameworkConfig when no framework package metadata', () => {
      const result = getTemplateRequiredPackages('react-native-web', undefined, {
        templateRequires: ['@molecule/app-ui', '@molecule/app-ui-react-native'],
      })
      expect(result).toEqual(['@molecule/app-ui', '@molecule/app-ui-react-native'])
    })

    it('should prefer framework package metadata over appFrameworkConfig', () => {
      const result = getTemplateRequiredPackages(
        'react',
        { molecule: { templateRequires: ['@molecule/app-i18n'] } },
        { templateRequires: ['@molecule/app-ui'] },
      )
      expect(result).toEqual(['@molecule/app-i18n'])
    })
  })

  describe('ensureE2EManifest', () => {
    it('gives an app both e2e scripts, and lists before running the changed set', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'mlcl-e2e-manifest-'))
      try {
        await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }))
        await ensureE2EManifest(dir)
        const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as {
          scripts: Record<string, string>
        }
        expect(manifest.scripts['test:e2e']).toBe('playwright test')
        // `--only-changed` with nothing selected prints nothing and exits 0, so
        // the `--list` runs FIRST and states the count ("Total: 0 tests in 0
        // files"). Without it an empty selection reads as a pass.
        expect(manifest.scripts['test:e2e:changed']).toBe(
          'playwright test --only-changed --list && playwright test --only-changed',
        )
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    it('never overwrites scripts the app already defines', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'mlcl-e2e-manifest-keep-'))
      try {
        await writeFile(
          join(dir, 'package.json'),
          JSON.stringify({
            name: 'x',
            scripts: { 'test:e2e': 'pnpm exec playwright test', 'test:e2e:changed': 'mine' },
          }),
        )
        await ensureE2EManifest(dir)
        const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as {
          scripts: Record<string, string>
        }
        expect(manifest.scripts['test:e2e']).toBe('pnpm exec playwright test')
        expect(manifest.scripts['test:e2e:changed']).toBe('mine')
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    type Manifest = {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const readManifest = async (dir: string): Promise<Manifest> =>
      JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as Manifest

    const withManifest = async (
      manifest: Record<string, unknown>,
      run: (dir: string) => Promise<void>,
    ): Promise<void> => {
      const dir = await mkdtemp(join(tmpdir(), 'mlcl-e2e-manifest-pins-'))
      try {
        await writeFile(join(dir, 'package.json'), JSON.stringify(manifest))
        await run(dir)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    }

    it('keeps a runtime-section e2e pin and never adds a conflicting dev pin', async () => {
      const e2e = '@molecule/app-e2e-fixtures-default'
      const runtime = { [e2e]: '0.9.0', '@playwright/test': '0.9.1', 'some-runtime-lib': '2.0.0' }
      await withManifest(
        { name: 'x', dependencies: runtime, devDependencies: { typescript: '5.0.0' } },
        async (dir) => {
          await ensureE2EManifest(dir)
          const manifest = await readManifest(dir)
          // The runtime pin is untouched (never upgraded from the registry) and
          // OWNS the declaration: a devDependencies copy would install a
          // different version than the one the manifest appears to pin.
          expect(manifest.dependencies).toEqual(runtime)
          expect(manifest.devDependencies?.[e2e]).toBeUndefined()
          expect(manifest.devDependencies?.['@playwright/test']).toBeUndefined()
          expect(manifest.devDependencies?.typescript).toBe('5.0.0')
          // Tooling it did not have is still added, in the dev section.
          expect(manifest.devDependencies?.['@molecule/app-e2e']).toBe(
            getMoleculeVersion('@molecule/app-e2e'),
          )
        },
      )
    })

    it('normalizes an identical duplicate to a single runtime declaration', async () => {
      const e2e = '@molecule/app-e2e'
      await withManifest(
        { name: 'x', dependencies: { [e2e]: '0.9.0' }, devDependencies: { [e2e]: '0.9.0' } },
        async (dir) => {
          await ensureE2EManifest(dir)
          const manifest = await readManifest(dir)
          expect(manifest.dependencies?.[e2e]).toBe('0.9.0')
          expect(manifest.devDependencies?.[e2e]).toBeUndefined()
        },
      )
    })

    it('normalizes conflicting duplicates to the existing runtime pin', async () => {
      const e2e = '@molecule/app-e2e'
      await withManifest(
        { name: 'x', dependencies: { [e2e]: '0.9.0' }, devDependencies: { [e2e]: '9.9.9' } },
        async (dir) => {
          await ensureE2EManifest(dir)
          const manifest = await readManifest(dir)
          expect(manifest.dependencies?.[e2e]).toBe('0.9.0')
          expect(manifest.devDependencies?.[e2e]).toBeUndefined()
        },
      )
    })

    it('preserves an explicit dev-only e2e pin', async () => {
      const e2e = '@molecule/app-e2e-playwright'
      await withManifest({ name: 'x', devDependencies: { [e2e]: '0.0.1-devpin' } }, async (dir) => {
        await ensureE2EManifest(dir)
        const manifest = await readManifest(dir)
        expect(manifest.devDependencies?.[e2e]).toBe('0.0.1-devpin')
        expect(manifest.dependencies?.[e2e]).toBeUndefined()
      })
    })

    it('adds missing e2e tooling at the registry pin in devDependencies', async () => {
      await withManifest({ name: 'x' }, async (dir) => {
        await ensureE2EManifest(dir)
        const manifest = await readManifest(dir)
        for (const name of [
          '@molecule/app-e2e',
          '@molecule/app-e2e-fixtures-default',
          '@molecule/app-e2e-playwright',
          '@molecule/app-e2e-preview',
        ]) {
          expect(manifest.devDependencies?.[name]).toBe(getMoleculeVersion(name))
        }
        expect(manifest.devDependencies?.['@playwright/test']).toBe(
          loadToolchain().app['@playwright/test'],
        )
        expect(manifest.dependencies).toBeUndefined()
      })
    })

    it('leaves the manifest unchanged on a repeated call', async () => {
      await withManifest(
        {
          name: 'x',
          dependencies: { '@molecule/app-e2e': '0.9.0' },
          devDependencies: {
            '@molecule/app-e2e': '0.9.0',
            '@molecule/app-e2e-preview': '0.0.1-devpin',
            typescript: '5.0.0',
          },
        },
        async (dir) => {
          await ensureE2EManifest(dir)
          const first = await readFile(join(dir, 'package.json'), 'utf8')
          await ensureE2EManifest(dir)
          expect(await readFile(join(dir, 'package.json'), 'utf8')).toBe(first)
        },
      )
    })
  })

  // Every flagship ships placeholder content so a fresh scaffold has something
  // to show. On 2026-09-16 a live run published the static-site template's
  // thirteen sample posts as someone's blog while the five files they had
  // shared never reached the site. Nothing in the project said the samples were
  // placeholders — these notices say it where the executor has to look.
  describe('stampDemoContentNotices', () => {
    const scaffold = async (): Promise<string> => {
      const dir = await mkdtemp(join(tmpdir(), 'mlcl-demo-notice-'))
      await mkdir(join(dir, 'app', 'content', 'posts'), { recursive: true })
      await mkdir(join(dir, 'api', 'fixtures'), { recursive: true })
      await mkdir(join(dir, 'api', 'src', 'handlers'), { recursive: true })
      await mkdir(join(dir, 'api', 'src', 'scripts'), { recursive: true })
      await writeFile(join(dir, 'app', 'content', 'posts', 'sample.md'), '---\ntitle: x\n---\n')
      await writeFile(join(dir, 'api', 'fixtures', 'posts.json'), '[]\n')
      await writeFile(join(dir, 'api', 'src', 'handlers', '_seed.ts'), 'export const a = 1\n')
      await writeFile(join(dir, 'api', 'src', 'scripts', 'seedCatalog.ts'), 'export const b = 2\n')
      await writeFile(join(dir, 'api', 'src', 'handlers', 'posts.ts'), 'export const c = 3\n')
      return dir
    }

    it('says at every placeholder location that real content replaces it', async () => {
      const dir = await scaffold()
      try {
        await stampDemoContentNotices(join(dir, 'app'), join(dir, 'api'))

        const contentReadme = await readFile(join(dir, 'app', 'content', 'README.md'), 'utf8')
        expect(contentReadme).toContain('REPLACES these samples')
        expect(contentReadme).toContain('templateDemo: true')

        const fixturesReadme = await readFile(join(dir, 'api', 'fixtures', 'README.md'), 'utf8')
        expect(fixturesReadme).toContain('placeholders')
        expect(fixturesReadme).toContain('rewrite or delete these files')

        for (const seed of [
          join(dir, 'api', 'src', 'handlers', '_seed.ts'),
          join(dir, 'api', 'src', 'scripts', 'seedCatalog.ts'),
        ]) {
          const body = await readFile(seed, 'utf8')
          expect(body, seed).toContain('DEMO SEED DATA')
          expect(body, seed).toContain('Never seed both')
        }
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    it('touches nothing but the seed modules, and is idempotent', async () => {
      const dir = await scaffold()
      try {
        await stampDemoContentNotices(join(dir, 'app'), join(dir, 'api'))
        await stampDemoContentNotices(join(dir, 'app'), join(dir, 'api'))

        const handler = await readFile(join(dir, 'api', 'src', 'handlers', 'posts.ts'), 'utf8')
        expect(handler).toBe('export const c = 3\n')

        const seed = await readFile(join(dir, 'api', 'src', 'handlers', '_seed.ts'), 'utf8')
        expect(seed.match(/DEMO SEED DATA/g)).toHaveLength(1)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })

    it('leaves an existing README alone and skips absent directories', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'mlcl-demo-notice-bare-'))
      try {
        await mkdir(join(dir, 'app', 'content'), { recursive: true })
        await writeFile(join(dir, 'app', 'content', 'README.md'), 'mine\n')

        await stampDemoContentNotices(join(dir, 'app'), join(dir, 'api'))

        expect(await readFile(join(dir, 'app', 'content', 'README.md'), 'utf8')).toBe('mine\n')
        expect(existsSync(join(dir, 'api'))).toBe(false)
      } finally {
        await rm(dir, { recursive: true, force: true })
      }
    })
  })
})

describe('ensureScratchDir', () => {
  it('creates the git-ignored scratch directory with the note explaining it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mlcl-scratch-'))
    try {
      await ensureScratchDir(dir)
      const readme = join(dir, '.mol-scratch', 'README.md')
      expect(existsSync(readme)).toBe(true)
      const text = await readFile(readme, 'utf-8')
      // It has to say WHY, or it is just an empty folder someone deletes.
      expect(text).toMatch(/git-ignored/i)
      expect(text).toMatch(/discards nothing|confirmation/i)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('never overwrites a note the project already has', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mlcl-scratch-keep-'))
    try {
      await mkdir(join(dir, '.mol-scratch'), { recursive: true })
      await writeFile(join(dir, '.mol-scratch', 'README.md'), 'mine')
      await ensureScratchDir(dir)
      expect(await readFile(join(dir, '.mol-scratch', 'README.md'), 'utf-8')).toBe('mine')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it('matches the path the scaffolded .gitignore ignores', async () => {
    // The directory is only silent because '.mol-*' is ignored at the project
    // root. If that entry ever moves, this convention starts gating again.
    const gitignore = await readFile(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '..',
        '..',
        '..',
        'templates',
        'apps',
        'blog',
        '.gitignore',
      ),
      'utf-8',
    )
    expect(gitignore).toMatch(/^\.mol-\*$/m)
  })
})
