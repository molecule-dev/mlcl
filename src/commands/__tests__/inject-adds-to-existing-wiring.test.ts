/**
 * `mlcl add <package> --inject` (which runs `mlcl inject -m <package>`) in a project that
 * already wires providers, and in a project Molecule did not create.
 *
 * `-m` synthesizes the shared files from the added package alone. Writing them over the
 * project's copies made every second `add --inject` rewrite `setupBonds()` to wire only the new
 * provider (the database, config, secrets and middleware bonds were gone) and regenerate
 * `server.ts` and its smoke test to match. In a project Molecule did not create, inject also
 * wrote a second server entry point, a router, a smoke test that failed, TypeScript files into
 * a JavaScript project, reformatted the project's own files, and never said where to call the
 * setup function.
 *
 * Runs the real oclif command against temp projects whose `node_modules` is the workspace's,
 * so every `@molecule/*` package resolves the way an installed project resolves it.
 *
 * @module
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  generateI18nDefaultSetupBond,
  planInjection,
  resolveDefaultProvidersFromPlans,
} from '../../lib/injector.js'
import Inject from '../inject.js'

vi.mock('execa', () => ({ execa: vi.fn() }))

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
// The workspace node_modules that links every @molecule package.
const WORKSPACE_MODULES = dirname(
  dirname(fileURLToPath(import.meta.resolve('vitest/package.json'))),
)

let dir: string | null = null
afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
  dir = null
})

async function project(
  prefix: string,
  manifest: object,
  files: Record<string, string>,
): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), prefix))
  await symlink(WORKSPACE_MODULES, join(dir, 'node_modules'))
  await writeFile(join(dir, 'package.json'), JSON.stringify(manifest, null, 2) + '\n')
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(dir, path)), { recursive: true })
    await writeFile(join(dir, path), content)
  }
  return dir
}

async function inject(
  path: string,
  molecules: string | string[],
  extra: string[] = [],
): Promise<string> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    [
      ...[molecules].flat().flatMap((name) => ['-m', name]),
      '-p',
      path,
      '--no-install',
      '--no-test',
      '--no-ai',
      ...extra,
    ],
    config,
  )
  vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
  const log = vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
  await cmd.run()
  return log.mock.calls.map((args) => args.map(String).join(' ')).join('\n')
}

const EXISTING_INDEX = `import { resolveAll } from '@molecule/api-secrets'

import { setupAudit } from './audit.js'
import { setupEmailsMailgun } from './emails-mailgun.js'
import { setupSecretsEnv } from './secrets-env.js'

export async function setupBonds(): Promise<void> {
  setupSecretsEnv()

  await resolveAll(['MAILGUN_API_KEY', 'MAILGUN_DOMAIN', 'MAILGUN_API_HOST'])
  setupEmailsMailgun()

  // KEEP THIS CALL LAST: it wraps the providers bonded above.
  setupAudit()
}
`

describe('mlcl inject -m adds to the wiring a project already has (OLD MUSTFAIL)', () => {
  it('keeps every provider setupBonds() wires and only adds the new one', async () => {
    const path = await project(
      'mlcl-inject-adds-',
      {
        name: 'demo-api',
        version: '1.0.0',
        private: true,
        type: 'module',
        molecule: { projectType: 'api' },
        dependencies: {
          '@molecule/api-cache-memory': '1.0.0',
          '@molecule/api-emails-mailgun': '1.0.0',
          '@molecule/api-secrets-env': '1.0.0',
        },
      },
      {
        'src/bonds/index.ts': EXISTING_INDEX,
        'src/bonds/audit.ts': 'export function setupAudit(): void {}\n',
        'src/bonds/emails-mailgun.ts': 'export function setupEmailsMailgun(): void {}\n',
        'src/bonds/secrets-env.ts': 'export function setupSecretsEnv(): void {}\n',
        'src/server.ts': '// the project server\n',
        'src/App/router.ts': '// the project router\n',
      },
    )
    await inject(path, '@molecule/api-cache-memory')

    const index = await readFile(join(path, 'src/bonds/index.ts'), 'utf8')
    for (const call of ['setupSecretsEnv()', 'setupEmailsMailgun()', 'setupAudit()'])
      expect(index, call).toContain(call)
    expect(index).toContain("import { setupCacheMemory } from './cache-memory.js'")
    expect(index).toContain("'MAILGUN_API_KEY'")
    // The added provider runs before the call marked to stay last.
    expect(index.indexOf('setupCacheMemory()')).toBeLessThan(index.indexOf('KEEP THIS CALL LAST'))
    expect(existsSync(join(path, 'src/bonds/cache-memory.ts'))).toBe(true)
    // Files generated from the added package alone never replace the project's.
    expect(await readFile(join(path, 'src/server.ts'), 'utf8')).toBe('// the project server\n')
    expect(await readFile(join(path, 'src/App/router.ts'), 'utf8')).toBe('// the project router\n')
  })
})

describe('mlcl inject in a project Molecule did not create (OLD MUSTFAIL)', () => {
  it('writes only the setup files, in JavaScript, leaves the project files alone and names the call', async () => {
    // Unformatted on purpose: inject must not reformat a file it did not write.
    const server = "import express from 'express';\nconst  app = express();\napp.listen(3000);\n"
    const path = await project(
      'mlcl-inject-existing-',
      {
        name: 'plain-express',
        version: '1.0.0',
        type: 'module',
        scripts: { start: 'node src/server.js' },
        dependencies: { express: '5.2.1', '@molecule/api-emails-mailgun': '1.0.0' },
      },
      { 'src/server.js': server },
    )
    const logged = await inject(path, '@molecule/api-emails-mailgun')

    const index = await readFile(join(path, 'src/bonds/index.js'), 'utf8')
    expect(index).toContain('export async function setupBonds()')
    expect(index).not.toContain(': Promise<void>')
    expect(existsSync(join(path, 'src/bonds/emails-mailgun.js'))).toBe(true)
    for (const absent of [
      'src/server.ts',
      'src/bonds/index.ts',
      'src/__tests__',
      'src/App/router.ts',
    ])
      expect(existsSync(join(path, absent)), absent).toBe(false)
    expect(await readFile(join(path, 'src/server.js'), 'utf8')).toBe(server)
    expect(logged).toContain('In src/server.js, before the server starts listening:')
    expect(logged).toContain("import { setupBonds } from './bonds/index.js'")

    // Every package the setup files import is one the project declares. This node_modules is the
    // workspace's, where @molecule/api-secrets resolves, but a real project that never added it
    // failed to build on the generated `import { resolveAll } from '@molecule/api-secrets'`
    // (harness eval `add`, 2026-11-23).
    const manifest = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'))
    const declared = { ...manifest.dependencies, ...manifest.devDependencies }
    for (const file of await readdir(join(path, 'src/bonds'))) {
      const text = await readFile(join(path, 'src/bonds', file), 'utf8')
      for (const [, spec] of text.matchAll(/from '([^.'][^']*)'/g)) {
        const name = spec
          .split('/')
          .slice(0, spec.startsWith('@') ? 2 : 1)
          .join('/')
        expect(Object.keys(declared), `src/bonds/${file} imports ${name}`).toContain(name)
      }
    }

    // The consumer path: the generated setup really bonds the provider.
    const out = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const { setupBonds } = await import('./src/bonds/index.js'); await setupBonds(); const e = await import('@molecule/api-emails'); console.log(Boolean(e.getTransport()))",
      ],
      {
        cwd: path,
        env: {
          ...process.env,
          MAILGUN_API_KEY: 'key',
          MAILGUN_DOMAIN: 'mg.example.com',
          MAILGUN_API_HOST: 'api.mailgun.net',
        },
      },
    )
    expect(out.toString().trim()).toBe('true')
  })

  it('wires a provider with no secrets without importing a secrets package the project lacks', async () => {
    // Harness eval `add`, 2026-11-23: `mlcl add @molecule/api-uploads-filesystem --inject` in an
    // Express app wrote `import { resolveAll } from '@molecule/api-secrets'`, a package nothing
    // installed, and the app's next build failed with TS2307.
    const path = await project(
      'mlcl-inject-nosecrets-',
      {
        name: 'notes-api',
        version: '1.0.0',
        type: 'module',
        scripts: { build: 'tsc', start: 'node dist/server.js' },
        dependencies: { express: '5.2.1', '@molecule/api-uploads-filesystem': '1.0.0' },
        devDependencies: { typescript: '6.0.3' },
      },
      {
        'tsconfig.json': '{ "compilerOptions": { "module": "NodeNext", "strict": true } }\n',
        'src/server.ts': "import express from 'express'\nexpress().listen(3000)\n",
      },
    )
    await inject(path, '@molecule/api-uploads-filesystem')
    const index = await readFile(join(path, 'src/bonds/index.ts'), 'utf8')
    expect(index).toContain('setupUploadsFilesystem()')
    expect(index).not.toContain('@molecule/api-secrets')
    expect(index).not.toContain('resolveAll')
    const manifest = JSON.parse(await readFile(join(path, 'package.json'), 'utf8'))
    expect(Object.keys(manifest.dependencies)).not.toContain('@molecule/api-secrets')
  })

  it('wires every package -m names: the uploads provider and the body parser it needs', async () => {
    // `mlcl add @molecule/api-uploads-filesystem --inject` passes the providers it declared too;
    // injected alone, the body parser stayed unbonded and the first upload failed (harness eval add).
    const uploads = '@molecule/api-uploads-filesystem'
    const parser = '@molecule/api-middleware-body-parser-express'
    const path = await project(
      'mlcl-inject-several-',
      {
        name: 'notes-api',
        version: '1.0.0',
        type: 'module',
        scripts: { start: 'node src/server.js' },
        dependencies: {
          express: '5.2.1',
          '@molecule/api-bond': '1.0.0',
          '@molecule/api-i18n': '1.0.0',
          '@molecule/api-uploads': '1.0.0',
          '@molecule/api-middleware-body-parser': '1.0.0',
          [parser]: '1.0.0',
          [uploads]: '1.0.0',
        },
      },
      { 'src/server.js': "import express from 'express'\nexpress().listen(3000)\n" },
    )
    await inject(path, [uploads, parser])
    const index = await readFile(join(path, 'src/bonds/index.js'), 'utf8')
    expect(index).toContain('setupUploadsFilesystem()')
    expect(index).toContain('setupMiddlewareBodyParserExpress()')

    // The consumer path: the generated setup bonds the upload parser receiveUploads() runs.
    const out = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const { setupBonds } = await import('./src/bonds/index.js'); await setupBonds(); const b = await import('@molecule/api-middleware-body-parser'); console.log(typeof b.getUploadParserFactory())",
      ],
      { cwd: path },
    )
    expect(out.toString().trim()).toBe('function')
  })

  // r20 harness eval (2026-11-24): `mlcl add … --inject` printed the next steps, then the Quick
  // Start and every declaration it imports. Claude Code read the output through `| tail -30`, saw
  // only types, and spent two more steps finding the setup call and where the files go.
  it('ends with the next steps, after how to call the added package (OLD MUSTFAIL)', async () => {
    const uploads = '@molecule/api-uploads-filesystem'
    const parser = '@molecule/api-middleware-body-parser-express'
    const path = await project(
      'mlcl-inject-guide-',
      {
        name: 'notes-api',
        version: '1.0.0',
        type: 'module',
        scripts: { start: 'node src/server.js', build: 'tsc' },
        dependencies: {
          express: '5.2.1',
          '@molecule/api-bond': '1.0.0',
          '@molecule/api-i18n': '1.0.0',
          '@molecule/api-uploads': '1.0.0',
          '@molecule/api-middleware-body-parser': '1.0.0',
          [parser]: '1.0.0',
          [uploads]: '1.0.0',
        },
      },
      { 'src/server.js': "import express from 'express'\nexpress().listen(3000)\n" },
    )
    const lines = (await inject(path, [uploads, parser], ['--guide', uploads])).split('\n')
    const at = (text: string): number => lines.findIndex((line) => line.includes(text))
    // The guidance (the core's Quick Start and declarations, or the pointer to its doc) is one
    // block, printed whole before the steps.
    const guidance = at('Your code calls it through @molecule/api-uploads')
    expect(guidance).toBeGreaterThanOrEqual(0)
    expect(at('Next steps')).toBeGreaterThan(guidance)
    // The last lines are the steps: the setup call and the build. (A one-call serve check named
    // here was run in none of 20 harness-eval adds, 2026-11-25: both harnesses start the server
    // and call the route in a command of their own.)
    const tail = lines.slice(-6).join('\n')
    expect(tail).toContain('await setupBonds()')
    expect(tail).toContain('npm run build')
    expect(tail).not.toContain('mlcl check')
  })

  it('writes ES modules as .mjs in a CommonJS package and imports them dynamically', async () => {
    const path = await project(
      'mlcl-inject-cjs-',
      {
        name: 'cjs-express',
        version: '1.0.0',
        main: 'index.js',
        dependencies: { express: '5.2.1', '@molecule/api-emails-mailgun': '1.0.0' },
      },
      { 'index.js': "const express = require('express')\nexpress().listen(3000)\n" },
    )
    const logged = await inject(path, '@molecule/api-emails-mailgun')
    const index = await readFile(join(path, 'src/bonds/index.mjs'), 'utf8')
    expect(index).toContain("from './emails-mailgun.mjs'")
    expect(logged).toContain("const { setupBonds } = await import('./src/bonds/index.mjs')")
  })

  it('a second add keeps the first provider (counterexample: the setup file already exists)', async () => {
    const path = await project(
      'mlcl-inject-second-',
      {
        name: 'plain-express',
        version: '1.0.0',
        type: 'module',
        scripts: { start: 'node src/server.js' },
        dependencies: {
          '@molecule/api-cache-memory': '1.0.0',
          '@molecule/api-emails-mailgun': '1.0.0',
        },
      },
      { 'src/server.js': "import { setupBonds } from './bonds/index.js'\nawait setupBonds()\n" },
    )
    await inject(path, '@molecule/api-emails-mailgun')
    const logged = await inject(path, '@molecule/api-cache-memory')
    const index = await readFile(join(path, 'src/bonds/index.js'), 'utf8')
    expect(index).toContain('setupEmailsMailgun()')
    expect(index).toContain('setupCacheMemory()')
    // The entry file already calls setupBonds(), so there is no step to print for it.
    expect(logged).not.toContain('before the server starts listening')
  })
})

describe('default providers respect the provider a project already declares (OLD MUSTFAIL)', () => {
  it('adding a resource to a SQLite project does not wire Postgres as well', async () => {
    const path = await project('mlcl-default-provider-', { name: 'x', version: '1.0.0' }, {})
    const plan = await planInjection('@molecule/api-resource-device', path)
    const molecules = ['@molecule/api-resource-device']
    expect(
      await resolveDefaultProvidersFromPlans([plan], molecules, path, [
        '@molecule/api-database-sqlite',
      ]),
    ).not.toContain('@molecule/api-database-postgresql')
    // Counterexample: with no database provider declared, the default still comes in.
    expect(await resolveDefaultProvidersFromPlans([plan], molecules, path, [])).toContain(
      '@molecule/api-database-postgresql',
    )
  })
})

// `mlcl add <pkg> --inject` declares a package's companion locale bond and names it with -m, but
// the app's i18n bond already existed and was kept as it was, so the package's UI text never
// loaded. A full `mlcl inject` wrote it.
describe('mlcl inject -m loads a new app locale bond in the existing i18n bond (OLD MUSTFAIL)', () => {
  it('adds the locale bond loader and keeps the ones the bond already had', async () => {
    const setup = '@molecule/app-i18n-default'
    const existing = generateI18nDefaultSetupBond(undefined, setup, 'i18nProvider', 'I18nDefault', [
      setup,
      '@molecule/app-locales-auth',
    ])
    const path = await project(
      'mlcl-inject-app-locales-',
      {
        name: 'demo-app',
        version: '1.0.0',
        private: true,
        type: 'module',
        molecule: { projectType: 'app', framework: 'react' },
        dependencies: {
          react: '19.2.4',
          '@molecule/app-i18n': '1.0.0',
          '@molecule/app-i18n-default': '1.0.0',
          '@molecule/app-locales-auth': '1.0.0',
          '@molecule/app-clipboard': '1.0.0',
          '@molecule/app-locales-clipboard': '1.0.0',
        },
      },
      { 'src/bonds/i18n-default.ts': existing },
    )
    await inject(path, ['@molecule/app-clipboard', '@molecule/app-locales-clipboard'])

    const bond = await readFile(join(path, 'src/bonds/i18n-default.ts'), 'utf8')
    expect(bond).toContain('@molecule/app-locales-clipboard/loader.js')
    expect(bond).toContain('@molecule/app-locales-auth/loader.js')
  })

  it('leaves the bond alone when the add brings no locale bond (counterexample)', async () => {
    const setup = '@molecule/app-i18n-default'
    const existing = generateI18nDefaultSetupBond(undefined, setup, 'i18nProvider', 'I18nDefault', [
      setup,
      '@molecule/app-locales-auth',
    ])
    const path = await project(
      'mlcl-inject-app-locales-none-',
      {
        name: 'demo-app',
        version: '1.0.0',
        private: true,
        type: 'module',
        molecule: { projectType: 'app', framework: 'react' },
        dependencies: {
          react: '19.2.4',
          '@molecule/app-i18n': '1.0.0',
          '@molecule/app-i18n-default': '1.0.0',
          '@molecule/app-locales-auth': '1.0.0',
          '@molecule/app-analytics': '1.0.0',
          '@molecule/app-analytics-posthog': '1.0.0',
        },
      },
      { 'src/bonds/i18n-default.ts': existing },
    )
    await inject(path, '@molecule/app-analytics-posthog')
    expect(await readFile(join(path, 'src/bonds/i18n-default.ts'), 'utf8')).toBe(existing)
  })
})

// `mlcl add <package>` without --inject ends with "Run mlcl inject". In a project Molecule
// created, that bare inject rendered every shared file from the manifest and wrote it over the
// project's copy: a flagship's auth bond, which also bonds the HTTP client every relative
// package request needs, became a plain JWT client and those requests went to the page origin.
describe('mlcl inject with no -m keeps the shared files a created project has (OLD MUSTFAIL)', () => {
  const AUTH_BOND = "// the project's auth bond\nexport function setupAuthDefault(): void {}\n"
  const created = (): Promise<string> =>
    project(
      'mlcl-inject-bare-',
      {
        name: 'demo-app',
        version: '1.0.0',
        private: true,
        type: 'module',
        molecule: { projectType: 'app', framework: 'react' },
        dependencies: {
          react: '19.2.4',
          '@molecule/app-auth': '3.6.0',
          '@molecule/app-http': '1.10.0',
        },
      },
      { 'src/bonds/auth-default.ts': AUTH_BOND },
    )

  it('leaves an existing auth bond as it is', async () => {
    const path = await created()
    await inject(path, [])
    expect(await readFile(join(path, 'src/bonds/auth-default.ts'), 'utf8')).toBe(AUTH_BOND)
  })

  it('counterexample: --force still writes it', async () => {
    const path = await created()
    await inject(path, [], ['--force'])
    expect(await readFile(join(path, 'src/bonds/auth-default.ts'), 'utf8')).not.toBe(AUTH_BOND)
  })
})
