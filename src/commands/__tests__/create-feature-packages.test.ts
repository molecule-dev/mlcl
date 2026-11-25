/**
 * `mlcl create` with a custom stack: every `@molecule/*` package the app's own files import is a
 * dependency of the app, and `--packages` reads the names as written.
 *
 * On 2026-11-25 a Claude run created a full-stack app with `@molecule/api-bonds-default-express`
 * among its packages. That bundle peers on the payments providers, so the scaffold wrote the plan
 * page and the settings panel, but their packages were worked out before the peers and never
 * declared: the app's typecheck and build failed on its first run. No package a custom stack may
 * name brings payments through a peer any more (the bundle is scaffold-only, below), so the test
 * names the payments provider itself. In the same round a Codex run wrote
 * `--packages @molecule/a @molecule/b @molecule/c` and was refused.
 *
 * In round 34 a Claude run named that bundle and `@molecule/api-server-default-express` beside a
 * user, a SQLite and an app-auth package. The custom scaffold writes its own server and bond wiring
 * and used neither, and the bundle's required peers added 43 dependencies (Stripe, Meilisearch,
 * S3, Postgres beside SQLite): the create took 71 s instead of 27 s. Both are `scaffold-only` in
 * the registry, and create refuses them before writing anything.
 *
 * Runs the REAL oclif command against a temp directory, without an install.
 *
 * @module
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import Create from '../create.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const STACK = ['@molecule/api-resource-user', '@molecule/api-database-sqlite', '@molecule/app-auth']

describe('mlcl create with a custom stack', () => {
  let root: string
  let prevCwd: string

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mlcl-create-feature-packages-'))
    prevCwd = process.cwd()
    process.chdir(root)
  })

  afterEach(async () => {
    process.chdir(prevCwd)
    await rm(root, { recursive: true, force: true })
  })

  async function create(argv: string[]): Promise<string> {
    const config = await Config.load(MLCL_ROOT)
    const cmd = new Create(
      [
        ...argv,
        '--type',
        'full-stack',
        '--framework',
        'react',
        '--no-interactive',
        '--skip-install',
      ],
      config,
    )
    vi.spyOn(cmd, 'warn').mockImplementation((input) => input)
    vi.spyOn(cmd, 'log').mockImplementation(() => undefined)
    await cmd.run()
    return join(root, 'shop')
  }

  /** Each `@molecule/*` package a file under `app/src` imports, and whether `app/package.json` declares it. */
  function appImports(project: string): Map<string, boolean> {
    const declared = JSON.parse(readFileSync(join(project, 'app', 'package.json'), 'utf8'))
    const deps = { ...declared.dependencies, ...declared.devDependencies }
    const imports = new Map<string, boolean>()
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) walk(path)
        else if (/\.(tsx?|css)$/.test(entry.name))
          for (const match of readFileSync(path, 'utf8').matchAll(
            /\bfrom\s+['"](@molecule\/[a-z0-9-]+)(?:\/[^'"]*)?['"]/g,
          ))
            imports.set(match[1] as string, (match[1] as string) in deps)
      }
    }
    walk(join(project, 'app', 'src'))
    return imports
  }

  it('declares the packages of the pages payments brings', async () => {
    const project = await create([
      'shop',
      '--packages',
      [...STACK, '@molecule/api-payments-stripe'].join(','),
    ])
    expect(existsSync(join(project, 'app', 'src', 'pages', 'PlanUpdated.tsx'))).toBe(true)
    const imports = appImports(project)
    expect(imports.get('@molecule/app-plan-updated-page-react')).toBe(true)
    expect(imports.get('@molecule/app-settings-panel-react')).toBe(true)
    expect([...imports].filter(([, isDeclared]) => !isDeclared).map(([name]) => name)).toEqual([])
  }, 120_000)

  it('writes no plan page, and declares no package for one, when nothing brings payments', async () => {
    const project = await create(['shop', '--packages', STACK.join(',')])
    expect(existsSync(join(project, 'app', 'src', 'pages', 'PlanUpdated.tsx'))).toBe(false)
    const declared = JSON.parse(readFileSync(join(project, 'app', 'package.json'), 'utf8'))
    expect(declared.dependencies).not.toHaveProperty('@molecule/app-plan-updated-page-react')
    expect([...appImports(project)].filter(([, isDeclared]) => !isDeclared)).toEqual([])
  }, 120_000)

  it('reads names separated by spaces and without the scope, then the project name (OLD MUSTFAIL)', async () => {
    const project = await create([
      '--packages',
      '@molecule/api-resource-user',
      'api-database-sqlite',
      '@molecule/app-auth',
      'shop',
    ])
    const api = JSON.parse(readFileSync(join(project, 'api', 'package.json'), 'utf8'))
    expect(api.dependencies).toHaveProperty('@molecule/api-database-sqlite')
    expect(api.dependencies).not.toHaveProperty('@molecule/api-database-postgresql')
  }, 120_000)

  it('refuses a name that is not a package, and writes nothing', async () => {
    await expect(
      create(['shop', '--packages', '@molecule/api-resource-user,@molecule/api-database-sqlitex']),
    ).rejects.toThrow(
      /Not @molecule packages: @molecule\/api-database-sqlitex\. Nothing was created/,
    )
    expect(existsSync(join(root, 'shop'))).toBe(false)
  }, 120_000)

  it('refuses the bundles only the scaffolds choose, names them and the packages to keep, and writes nothing (OLD MUSTFAIL)', async () => {
    // Round 34's call, as Claude made it.
    const named = [
      '@molecule/api-resource-user',
      '@molecule/api-server-default-express',
      '@molecule/api-bonds-default-express',
      '@molecule/api-database-sqlite',
      '@molecule/app-auth',
    ]
    await expect(create(['shop', '--packages', named.join(',')])).rejects.toThrow(
      'Only the scaffolds choose @molecule/api-server-default-express, @molecule/api-bonds-default-express: a custom stack already has its server and bond wiring, and naming one installs every provider it wires. Nothing was created. Run it again with --packages @molecule/api-resource-user,@molecule/api-database-sqlite,@molecule/app-auth.',
    )
    expect(existsSync(join(root, 'shop'))).toBe(false)
  }, 120_000)

  it('refuses an app bond bundle named without its scope', async () => {
    await expect(create(['shop', '--packages', 'app-bonds-default-react'])).rejects.toThrow(
      /Only the scaffolds choose @molecule\/app-bonds-default-react: .* Run it again with no --packages\./,
    )
    expect(existsSync(join(root, 'shop'))).toBe(false)
  }, 120_000)
})
