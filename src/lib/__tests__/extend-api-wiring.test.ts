/**
 * The merges `mlcl inject -m` applies to an API project's existing shared files, and the
 * conversions it applies in a project Molecule did not create.
 *
 * @module
 */
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import ts from 'typescript'
import { afterEach, describe, expect, it } from 'vitest'

import {
  existingProjectFiles,
  inLanguage,
  projectLanguage,
  wiringSteps,
} from '../existing-project.js'
import { extendApiLocales, extendApiRouter, mountsRoutes } from '../extend-api-wiring.js'
import { extendApiBonds } from '../extend-app-bonds.js'
import { type FileOperation, GENERATED_ROUTER_MARKER } from '../injector.js'

/** Run an emitted startup against stub modules and record the calls it makes. */
async function run(
  source: string,
  modules: Record<string, Record<string, unknown>>,
): Promise<void> {
  const exports: Record<string, unknown> = {}
  new Function(
    'require',
    'exports',
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  )((name: string) => modules[name], exports)
  await (exports.setupBonds as () => Promise<void>)()
}

describe('extendApiBonds', () => {
  const existing = `import { resolveAll } from '@molecule/api-secrets'

import { setupCapture } from './_capture.js'
import { setupMailgun } from './mailgun.js'

export async function setupBonds(): Promise<void> {
  await resolveAll(['MAILGUN_API_KEY'])
  setupMailgun()

  // KEEP THIS CALL LAST: it wraps every provider above.
  await setupCapture()
}
`
  const generated = `import { resolveAll } from '@molecule/api-secrets'

import { setupSecretsEnv } from './secrets-env.js'
import { setupStripe } from './stripe.js'

export async function setupBonds(): Promise<void> {
  setupSecretsEnv()
  await resolveAll(['STRIPE_SECRET_KEY'])
  setupStripe()
}
`

  it('adds keys to the resolve, the secrets provider before it and new calls before the last call', async () => {
    const merged = extendApiBonds(existing, generated)
    const calls: string[] = []
    const record = (name: string) => (): number => calls.push(name)
    await run(merged, {
      '@molecule/api-secrets': {
        resolveAll: async (keys: string[]) => calls.push(`resolve:${keys.join(',')}`),
      },
      './_capture.js': { setupCapture: async () => calls.push('capture') },
      './mailgun.js': { setupMailgun: record('mailgun') },
      './secrets-env.js': { setupSecretsEnv: record('secrets') },
      './stripe.js': { setupStripe: record('stripe') },
    })
    expect(calls).toEqual([
      'secrets',
      'resolve:MAILGUN_API_KEY,STRIPE_SECRET_KEY',
      'mailgun',
      'stripe',
      'capture',
    ])
    // Merging the same package again changes nothing.
    expect(extendApiBonds(merged, generated)).toBe(merged)
  })

  it('leaves a bare resolveAll() alone: it already resolves every registered secret', () => {
    const bare = existing.replace("resolveAll(['MAILGUN_API_KEY'])", 'resolveAll()')
    expect(extendApiBonds(bare, generated)).toContain('await resolveAll()\n')
  })

  it('refuses an index without setupBonds instead of guessing', () => {
    expect(() => extendApiBonds('export const x = 1\n', generated)).toThrow(/setupBonds/)
  })
})

describe('extendApiLocales', () => {
  const locales = (names: string[]): string =>
    `import { registerLocaleModule } from '@molecule/api-i18n'
${names.map((n) => `import * as ${n}Locales from '@molecule/api-locales-${n}'`).join('\n')}

const localeModules = [${names.map((n) => `${n}Locales`).join(', ')}]

export function setupLocales(): void {
  for (const locales of localeModules) registerLocaleModule(locales)
}
`
  it('registers only the locale bonds the project lacks', () => {
    const merged = extendApiLocales(locales(['config', 'emails']), locales(['emails', 'cache']))
    expect(merged).toContain("import * as cacheLocales from '@molecule/api-locales-cache'")
    expect(merged).toContain('[configLocales, emailsLocales, cacheLocales]')
    expect(merged.match(/api-locales-emails/g)).toHaveLength(1)
    expect(extendApiLocales(merged, locales(['cache']))).toBe(merged)
  })
})

describe('extendApiRouter', () => {
  const router = (mounts: string, imports: string, body: string): string =>
    `${GENERATED_ROUTER_MARKER}
//
${mounts}
//
// To ADD a route, put it in api/src/handlers/index.ts.
import { Router } from 'express'
${imports}

export const router = Router()

${body}
`
  const existing = router(
    '// Mounted here — server.ts mounts this router at /api:\n//   @molecule/api-resource-device (Device): GET /devices',
    "import { requestHandlerMap as Device } from './Resource/Device/index.js'",
    'router.get(`/devices`, Device.auth, Device.query)',
  )
  const generated = router(
    '// Mounted here — server.ts mounts this router at /api:\n//   @molecule/api-resource-user (User): GET /users',
    "import { authorization as userAuthorization, requestHandlerMap as User } from './Resource/User/index.js'",
    'router.use(userAuthorization.verifyMiddleware())\n\nrouter.get(`/users`, User.query)',
  )

  it('keeps the existing mounts and adds the new import, gate, routes and header line', () => {
    const merged = extendApiRouter(existing, generated)
    expect(merged).toContain('router.get(`/devices`, Device.auth, Device.query)')
    expect(merged).toContain('router.get(`/users`, User.query)')
    expect(merged).toContain("requestHandlerMap as User } from './Resource/User/index.js'")
    expect(merged).toContain('//   @molecule/api-resource-device (Device): GET /devices')
    expect(merged).toContain('//   @molecule/api-resource-user (User): GET /users')
    // The gate runs before every route.
    expect(merged.indexOf('verifyMiddleware()')).toBeLessThan(merged.indexOf('`/devices`'))
    expect(extendApiRouter(merged, generated)).toBe(merged)
  })

  // An add of an email transport mounts the user resource's emails router from the editable router
  // file the project already imports by its default export. The generated import was added whole,
  // which declared `resourceUserRouter` twice (OLD MUSTFAIL).
  it('adds a named import beside the default import of the same module', () => {
    const mounted = router(
      '// Mounted here — server.ts mounts this router at /api:\n//   @molecule/api-resource-user (User): POST /users',
      "import resourceUserRouter from '../handlers/auth.js'",
      'router.use(resourceUserRouter)',
    )
    const withEmails = router(
      '// Mounted here — server.ts mounts this router at /api:\n//   @molecule/api-resource-user (User): POST /users',
      "import resourceUserRouter, { emailsRouter as resourceUserEmailsRouter } from '../handlers/auth.js'",
      'router.use(resourceUserRouter)\n\nrouter.use(resourceUserEmailsRouter)',
    )
    const merged = extendApiRouter(mounted, withEmails)
    expect(merged).toContain(
      "import resourceUserRouter, { emailsRouter as resourceUserEmailsRouter } from '../handlers/auth.js'",
    )
    expect(merged.match(/from '\.\.\/handlers\/auth\.js'/g)).toHaveLength(1)
    expect(merged).toContain('router.use(resourceUserEmailsRouter)')
    expect(extendApiRouter(merged, withEmails)).toBe(merged)
  })

  it('changes nothing when the added package mounts nothing', () => {
    const empty = router(
      '// It mounts no package routes: none of the selected packages declares any.',
      '',
      '',
    )
    expect(mountsRoutes(empty)).toBe(false)
    expect(extendApiRouter(existing, empty)).toBe(existing)
  })
})

describe('a project Molecule did not create', () => {
  let dir: string | null = null
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true })
    dir = null
  })

  it('is written in its own language', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-language-'))
    expect(projectLanguage(dir, { type: 'module' })).toBe('esm')
    expect(projectLanguage(dir, {})).toBe('commonjs')
    expect(projectLanguage(dir, { devDependencies: { typescript: '6.0.3' } })).toBe('typescript')
    await writeFile(join(dir, 'tsconfig.json'), '{}')
    expect(projectLanguage(dir, {})).toBe('typescript')
  })

  it('gets compiled bond files: types gone, imports kept, .mjs in a CommonJS package', () => {
    const file = {
      action: 'create' as const,
      targetPath: '/p/src/bonds/index.ts',
      content:
        "import type { X } from './types.js'\nimport { setupA } from './a.js'\nexport async function setupBonds(): Promise<void> { setupA() }\n",
      description: '',
    }
    const esm = inLanguage(file, 'esm')
    expect(esm.targetPath).toBe('/p/src/bonds/index.js')
    expect(esm.content).toContain("import { setupA } from './a.js'")
    expect(esm.content).not.toContain('Promise<void>')
    expect(esm.content).not.toContain('./types.js')
    const cjs = inLanguage(file, 'commonjs')
    expect(cjs.targetPath).toBe('/p/src/bonds/index.mjs')
    expect(cjs.content).toContain("import { setupA } from './a.mjs'")
    expect(inLanguage(file, 'typescript')).toBe(file)
  })

  it('gets no server entry, generated tests, CI workflow or empty router', () => {
    const at = (path: string, content = ''): FileOperation => ({
      action: 'create' as const,
      targetPath: `/p/${path}`,
      content,
      description: '',
    })
    const kept = existingProjectFiles(
      [
        at('src/server.ts'),
        at('src/__tests__/server.test.ts'),
        at('.github/workflows/ci.yml'),
        at(
          'src/App/router.ts',
          "import { Router } from 'express'\nexport const router = Router()\n",
        ),
        at('src/bonds/index.ts', 'export async function setupBonds() {}\n'),
      ],
      '/p',
      'typescript',
    )
    expect(kept.map((file) => file.targetPath)).toEqual(['/p/src/bonds/index.ts'])
  })

  it('is told where to call the setup function, unless its entry file already does', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mlcl-wiring-'))
    await mkdir(join(dir, 'src'))
    await writeFile(join(dir, 'src/app.ts'), 'export {}\n')
    const input = {
      projectPath: dir,
      manifest: { scripts: { start: 'tsx src/app.ts' } },
      language: 'typescript' as const,
      app: false,
      bondsIndex: join(dir, 'src/bonds/index.ts'),
    }
    expect(wiringSteps(input)).toEqual([
      [
        'In src/app.ts, before the server starts listening:',
        "import { setupBonds } from './bonds/index.js'",
        'await setupBonds()',
      ],
    ])
    await writeFile(join(dir, 'src/app.ts'), "import { setupBonds } from './bonds/index.js'\n")
    expect(wiringSteps(input)).toEqual([])
  })
})
