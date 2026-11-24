/**
 * `mlcl swap` in a project whose startup wires a provider through a default-bonds package
 * (`setupAllDefaultBonds()` from `@molecule/app-bonds-default-react`), as every flagship does for
 * its fonts, router, storage, styling, icons and clipboard: the index never imports that
 * provider's own setup, so the swap wires the new provider right after the defaults, which it
 * then replaces. The replaced provider stays pinned while a package the app keeps still imports it:
 * the project installs with legacy-peer-deps, so npm would not install it as that package's peer.
 * Run on copies of a real flagship's manifests and bonds directories.
 *
 * @module
 */

import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { Config } from '@oclif/core'
import ts from 'typescript'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import Swap from '../../commands/swap.js'
import { applyBondSwap, BondSwapError } from '../integrate.js'
import { loadRegistry } from '../registry.js'
import { importOrderProblems } from './import-order-lint.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')
const FLAGSHIP = join(MLCL_ROOT, 'templates', 'apps', 'blog')

let config: Config
beforeAll(async () => {
  config = await Config.load({ root: MLCL_ROOT })
})

const dirs: string[] = []
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

const exists = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  )

/**
 * A copy of one half of the blog flagship: its manifest and bonds directory.
 *
 * @param half - The app or the api.
 * @returns The project directory and its bonds directory.
 */
async function flagship(half: 'app' | 'api' = 'app'): Promise<{ dir: string; bonds: string }> {
  const dir = await mkdtemp(join(tmpdir(), 'mlcl-swap-defaults-'))
  dirs.push(dir)
  await mkdir(join(dir, 'src'), { recursive: true })
  await cp(join(FLAGSHIP, half, 'package.json'), join(dir, 'package.json'))
  await cp(join(FLAGSHIP, half, 'src', 'bonds'), join(dir, 'src', 'bonds'), { recursive: true })
  return { dir, bonds: join(dir, 'src', 'bonds') }
}

/**
 * The molecule peers the manifest's packages require and the manifest does not pin.
 *
 * @param dir - The project.
 * @returns Each unmet peer, as `<package> needs <peer>`.
 */
async function unmetPeers(dir: string): Promise<string[]> {
  const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
  ])
  const registry = new Map(
    [...loadRegistry('app'), ...loadRegistry('api')].map((pkg) => [pkg.name, pkg]),
  )
  return [...declared].flatMap((name) =>
    (registry.get(name)?.molecule?.moleculePeers ?? [])
      .filter((peer) => !declared.has(peer))
      .map((peer) => `${name} needs ${peer}`),
  )
}

/**
 * Runs the real `mlcl swap` from `dir`.
 *
 * @param dir - The project.
 * @param pkg - The provider to swap in.
 * @returns The command's exit error, if any.
 */
async function swap(dir: string, pkg: string): Promise<unknown> {
  const cwd = process.cwd()
  process.chdir(dir)
  try {
    await Swap.run([pkg, '--no-interactive', '--no-install', '--no-format'], config)
    return undefined
  } catch (error) {
    return error
  } finally {
    process.chdir(cwd)
  }
}

/**
 * The order `setupProviders()` calls its imported setups in, run against stand-ins.
 *
 * @param source - The bonds index.
 * @returns Each called setup's name, in call order.
 */
async function startupOrder(source: string): Promise<string[]> {
  const calls: string[] = []
  const exports: Record<string, unknown> = {}
  const module = (specifier: string): Record<string, unknown> =>
    new Proxy(
      {},
      {
        get: (_target, name) =>
          typeof name !== 'string'
            ? undefined
            : name.startsWith('setup')
              ? () => calls.push(name)
              : { from: specifier },
      },
    )
  new Function(
    'require',
    'exports',
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText,
  )(module, exports)
  await (exports.setupProviders as () => Promise<void>)()
  return calls
}

describe('swapping a provider the default bonds wire', () => {
  it('wires the new font after setupAllDefaultBonds() in a flagship', async () => {
    const { dir, bonds } = await flagship()
    const before = await readFile(join(bonds, 'index.ts'), 'utf-8')
    expect(before).not.toContain('setupAppFontsArimo')
    const unmet = await unmetPeers(dir)

    expect(await swap(dir, '@molecule/app-fonts-inter')).toBeUndefined()

    const index = await readFile(join(bonds, 'index.ts'), 'utf-8')
    expect(index).toMatch(/import \{ setupAppFontsInter \} from '\.\/app-fonts-inter\.js'/)
    expect(importOrderProblems(index, 'index.ts')).toEqual([])
    const order = await startupOrder(index)
    expect(order.indexOf('setupAppFontsInter')).toBe(order.indexOf('setupAllDefaultBonds') + 1)
    expect(await exists(join(bonds, 'app-fonts-inter.ts'))).toBe(true)
    // The old bond file nothing imported is removed with the provider.
    expect(await exists(join(bonds, 'app-fonts-arimo.ts'))).toBe(false)
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
    expect(manifest.dependencies['@molecule/app-fonts-inter']).toBeDefined()
    // setupAllDefaultBonds() still imports the default font: it stays pinned for it.
    expect(manifest.dependencies['@molecule/app-fonts-arimo']).toBeDefined()
    expect(await unmetPeers(dir)).toEqual(unmet)
  })

  it('keeps an api provider that the default bonds package imports pinned', async () => {
    const { dir, bonds } = await flagship('api')
    const unmet = await unmetPeers(dir)
    const registry = loadRegistry('api')

    const result = await applyBondSwap({
      projectPath: dir,
      oldPkg: registry.find((pkg) => pkg.name === '@molecule/api-emails-mailgun')!,
      newPkg: registry.find((pkg) => pkg.name === '@molecule/api-emails-sendgrid')!,
      newName: '@molecule/api-emails-sendgrid',
      implementsInterface: '@molecule/api-emails',
      newVersion: '1.0.0',
    })

    // api-bonds-default-express imports mailgun statically, so it stays pinned.
    expect(await unmetPeers(dir)).toEqual(unmet)
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
    expect(manifest.dependencies['@molecule/api-emails-mailgun']).toBeDefined()
    expect(manifest.dependencies['@molecule/api-emails-sendgrid']).toBe('1.0.0')
    expect(result.keptFor).toBe('@molecule/api-bonds-default-express')
    const index = await readFile(join(bonds, 'index.ts'), 'utf-8')
    expect(index).toContain("import { setupEmailsSendgrid } from './emails-sendgrid.js'")
    expect(index).not.toContain('setupEmailsMailgun')
  })

  it('drops a replaced provider nothing else requires', async () => {
    const { dir } = await flagship('api')
    const registry = loadRegistry('api')

    const result = await applyBondSwap({
      projectPath: dir,
      oldPkg: registry.find((pkg) => pkg.name === '@molecule/api-image-sharp')!,
      newPkg: registry.find((pkg) => pkg.name === '@molecule/api-image-jimp')!,
      newName: '@molecule/api-image-jimp',
      implementsInterface: '@molecule/api-image',
      newVersion: '1.0.0',
    })

    expect(result.keptFor).toBeUndefined()
    const manifest = JSON.parse(await readFile(join(dir, 'package.json'), 'utf-8'))
    expect(manifest.dependencies['@molecule/api-image-sharp']).toBeUndefined()
  })

  it('swaps a default-wired provider that has no bond file of its own', async () => {
    const { dir, bonds } = await flagship()
    await rm(join(bonds, 'app-fonts-arimo.ts'), { force: true })

    expect(await swap(dir, '@molecule/app-fonts-inter')).toBeUndefined()

    const index = await readFile(join(bonds, 'index.ts'), 'utf-8')
    const order = await startupOrder(index)
    expect(order.indexOf('setupAppFontsInter')).toBe(order.indexOf('setupAllDefaultBonds') + 1)
    expect(await exists(join(bonds, 'app-fonts-inter.ts'))).toBe(true)
  })

  it('still refuses an index that wires neither the provider nor the default bonds', async () => {
    const { dir, bonds } = await flagship()
    await writeFile(
      join(bonds, 'index.ts'),
      'export async function setupProviders(): Promise<void> {}\n',
    )
    const registry = loadRegistry('app')
    const thrown = await applyBondSwap({
      projectPath: dir,
      oldPkg: registry.find((pkg) => pkg.name === '@molecule/app-fonts-arimo')!,
      newPkg: registry.find((pkg) => pkg.name === '@molecule/app-fonts-inter')!,
      newName: '@molecule/app-fonts-inter',
      implementsInterface: '@molecule/app-fonts',
      newVersion: '1.0.0',
    }).then(
      () => null,
      (error: unknown) => error,
    )
    expect(thrown).toBeInstanceOf(BondSwapError)
    expect((thrown as BondSwapError).code).toBe('index-no-match')
    expect(await exists(join(bonds, 'app-fonts-arimo.ts'))).toBe(true)
    expect(await exists(join(bonds, 'app-fonts-inter.ts'))).toBe(false)
  })

  it('rewrites an old setup imported from a package, and keeps a bond file another bond imports', async () => {
    const { dir, bonds } = await flagship()
    const index = (await readFile(join(bonds, 'index.ts'), 'utf-8'))
      .split("import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'\n")
      .join(
        "import { setupAllDefaultBonds } from '@molecule/app-bonds-default-react'\n" +
          "import { setupAppFontsArimo } from '@molecule/app-bonds-default-react'\n",
      )
      .split('  setupAllDefaultBonds()\n')
      .join('  setupAllDefaultBonds()\n  setupAppFontsArimo()\n')
    await writeFile(join(bonds, 'index.ts'), index)
    await writeFile(
      join(bonds, 'app-fonts-arimo.ts'),
      "export { setupAppFontsArimo } from '@molecule/app-bonds-default-react'\n",
    )
    await writeFile(
      join(bonds, 'app-typography.ts'),
      "export { setupAppFontsArimo as setupTypography } from './app-fonts-arimo.js'\n",
    )

    expect(await swap(dir, '@molecule/app-fonts-inter')).toBeUndefined()

    const after = await readFile(join(bonds, 'index.ts'), 'utf-8')
    expect(after).not.toContain('setupAppFontsArimo')
    expect(importOrderProblems(after, 'index.ts')).toEqual([])
    const order = await startupOrder(after)
    expect(order.indexOf('setupAppFontsInter')).toBe(order.indexOf('setupAllDefaultBonds') + 1)
    expect(await exists(join(bonds, 'app-fonts-arimo.ts'))).toBe(true)
  })
})
