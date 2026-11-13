/**
 * A fresh custom app checks itself the same way under every web framework.
 *
 * Swapping an app's framework bond is only "minimal work" if the scaffold for each
 * framework compiles, lints, tests and builds with its own scripts. Before
 * 2026-11-13 a real `npm install` of a fresh Vue, Solid, Svelte or Angular app
 * failed one of those steps every time: `typecheck` ran plain `tsc`, which never
 * opens a `.vue` or `.svelte` file (so Svelte's type errors, including a `$store`
 * read of a plain object that throws at runtime, went unseen); `vue-router` was
 * imported but not declared; vite-plugin-solid moved the tests to jsdom, which no
 * scaffold installs; and the Svelte and Angular builds bundled without
 * type-checking. These checks run on what `createAppProject` writes, so a new
 * framework entry in the registry is held to them with no change here.
 */
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { builtinModules } from 'node:module'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadAppFrameworks } from '../registry.js'
import { createAppProject } from '../scaffold.js'

/** Web frameworks scaffolded through `createAppProject` (react-native has its own scaffolder). */
const FRAMEWORKS = Object.keys(loadAppFrameworks()).filter((name) => name !== 'react-native')

/** Source extensions plain `tsc` type-checks. */
const TSC_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts'])

/** Specifiers resolved by the framework or the bundler, not by an npm package. */
const NOT_PACKAGES = /^(\.|\/|\$app\/|\$lib|\$env\/|virtual:|node:|@molecule\/)/

const roots: Record<string, string> = {}

beforeAll(async () => {
  for (const framework of FRAMEWORKS) {
    roots[framework] = await mkdtemp(join(tmpdir(), `scaffold-toolchain-${framework}-`))
    await createAppProject(roots[framework], 'app', framework)
  }
}, 120_000)

afterAll(async () => {
  await Promise.all(Object.values(roots).map((root) => rm(root, { recursive: true, force: true })))
})

async function manifest(framework: string): Promise<{
  scripts: Record<string, string>
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
}> {
  return JSON.parse(await readFile(join(roots[framework], 'package.json'), 'utf8'))
}

async function sourceFiles(framework: string): Promise<string[]> {
  const files = await readdir(join(roots[framework], 'src'), { recursive: true })
  return files
    .filter((file) => /\.(ts|tsx|vue|svelte)$/.test(file))
    .map((file) => join('src', file))
}

/** The npm package a bare specifier names (`@scope/name/sub` → `@scope/name`). */
function packageOf(specifier: string): string {
  const parts = specifier.split('/')
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

describe.each(FRAMEWORKS)('a fresh %s app', (framework) => {
  it('type-checks every component file it writes, with a checker it installs', async () => {
    const { scripts, devDependencies } = await manifest(framework)
    const unreadByTsc = (await sourceFiles(framework)).filter(
      (file) => !TSC_EXTENSIONS.has(extname(file)),
    )
    if (unreadByTsc.length === 0) return
    // Plain tsc skips these files without a word, so the script must name the
    // framework's own checker, and that checker must be installed.
    expect(scripts.typecheck, `${unreadByTsc[0]} is not read by plain tsc`).not.toMatch(
      /^tsc --noEmit$/,
    )
    // The binary is named after its package (vue-tsc, svelte-check).
    const checker = scripts.typecheck.split('&&').pop()!.trim().split(' ')[0]
    expect(devDependencies, `${checker} runs typecheck but is not a devDependency`).toHaveProperty(
      checker,
    )
  })

  it('declares every third-party package its source imports', async () => {
    const { dependencies, devDependencies } = await manifest(framework)
    const declared = new Set([...Object.keys(dependencies), ...Object.keys(devDependencies)])
    const undeclared: string[] = []
    for (const file of [...(await sourceFiles(framework)), 'vite.config.ts']) {
      // Comments are dropped first: vite.config.ts explains its CJS handling with an
      // example import of a package no app installs.
      const text = (await readFile(join(roots[framework], file), 'utf8'))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1')
      for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]|\bimport\s+['"]([^'"]+)['"]/g)) {
        const specifier = match[1] ?? match[2]
        if (NOT_PACKAGES.test(specifier)) continue
        const name = packageOf(specifier)
        if (builtinModules.includes(name) || declared.has(name)) continue
        undeclared.push(`${file}: ${specifier}`)
      }
    }
    expect(undeclared).toEqual([])
  })

  it('type-checks before it bundles', async () => {
    const { scripts } = await manifest(framework)
    expect(scripts.build, 'build must run a type checker before vite build').toMatch(
      /(tsc|vue-tsc|svelte-check)[^&]*&&\s*vite build$/,
    )
  })

  it('runs its mocked tests in Node, whatever its vite plugin prefers', async () => {
    const config = await readFile(join(roots[framework], 'vite.config.ts'), 'utf8')
    expect(config).toMatch(/test:\s*\{[\s\S]*environment:\s*'node'/)
  })
})
