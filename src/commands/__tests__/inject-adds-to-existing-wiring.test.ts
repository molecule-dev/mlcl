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
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { Config } from '@oclif/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { planInjection, resolveDefaultProvidersFromPlans } from '../../lib/injector.js'
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

async function inject(path: string, molecule: string): Promise<string> {
  const config = await Config.load(MLCL_ROOT)
  const cmd = new Inject(
    ['-m', molecule, '-p', path, '--no-install', '--no-test', '--no-ai'],
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
