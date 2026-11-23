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
import { importOrderProblems } from './import-order-lint.js'

/** Web frameworks scaffolded through `createAppProject` (react-native has its own scaffolder). */
const FRAMEWORKS = Object.keys(loadAppFrameworks()).filter((name) => name !== 'react-native')

/** Source extensions plain `tsc` type-checks. */
const TSC_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts'])

/** Specifiers resolved by the framework or the bundler, not by an npm package. */
const NOT_PACKAGES = /^(\.|\/|\$app\/|\$env\/|virtual:|node:|@molecule\/)/

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
  imports?: Record<string, string>
}> {
  return JSON.parse(await readFile(join(roots[framework], 'package.json'), 'utf8'))
}

async function sourceFiles(framework: string): Promise<string[]> {
  const files = await readdir(join(roots[framework], 'src'), { recursive: true })
  return files
    .filter((file) => /\.(ts|tsx|vue|svelte)$/.test(file))
    .map((file) => join('src', file))
}

/**
 * Whether a `#` specifier matches a key of the app's package.json `imports` (`#lib/*`
 * covers `#lib/config.js`).
 */
function subpathImported(specifier: string, imports: Record<string, string> = {}): boolean {
  return Object.keys(imports).some((key) =>
    key.endsWith('/*') ? specifier.startsWith(key.slice(0, -1)) : specifier === key,
  )
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

  it('lints every component file it writes, with a plugin it installs', async () => {
    const { devDependencies } = await manifest(framework)
    const config = await readFile(join(roots[framework], 'eslint.config.js'), 'utf8')
    const extensions = new Set(
      (await sourceFiles(framework))
        .map((file) => extname(file))
        .filter((extension) => !TSC_EXTENSIONS.has(extension)),
    )
    for (const extension of extensions) {
      // ESLint opens a file only when a config's `files` names it; for .vue and
      // .svelte that config comes from the framework's own plugin (eslint-plugin-vue,
      // eslint-plugin-svelte), which the shared config loads only when declared.
      const plugin = `eslint-plugin-${extension.slice(1)}`
      expect(devDependencies, `${plugin} must lint the ${extension} files`).toHaveProperty(plugin)
    }
    if (extensions.size > 0) {
      // @molecule/eslint-config loads each declared framework plugin (its own tests lint .vue
      // and .svelte files through it), so the workspace config must be that package's.
      expect(devDependencies).toHaveProperty('@molecule/eslint-config')
      expect(config, 'eslint.config.js is not @molecule/eslint-config').toContain(
        "from '@molecule/eslint-config'",
      )
    }
  })

  it('formats every source file it writes, with the plugins prettier needs for them', async () => {
    const { scripts, devDependencies } = await manifest(framework)
    const prettierrc = JSON.parse(await readFile(join(roots[framework], '.prettierrc'), 'utf8'))
    const extensions = new Set((await sourceFiles(framework)).map((file) => extname(file).slice(1)))
    for (const extension of extensions) {
      // `{ts,ts}` was what a Vue, Svelte and Angular app's format script read.
      expect(scripts.format, `format never reads .${extension}`).toMatch(
        new RegExp(`src/\\*\\*/\\*\\.(${extension}'|\\{[^}]*\\b${extension}\\b)`),
      )
    }
    // Prettier parses .vue itself; .svelte needs the plugin, installed and configured.
    if (extensions.has('svelte')) {
      expect(devDependencies).toHaveProperty('prettier-plugin-svelte')
      expect(prettierrc.plugins).toContain('prettier-plugin-svelte')
    }
  })

  it('declares every third-party package and subpath import its source imports', async () => {
    const { dependencies, devDependencies, imports } = await manifest(framework)
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
        // A `#` specifier resolves through the app's own package.json `imports`.
        if (specifier.startsWith('#')) {
          if (!subpathImported(specifier, imports)) undeclared.push(`${file}: ${specifier}`)
          continue
        }
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

  // Svelte reports accessibility defects as compiler warnings (a clickable <div> with no key
  // handler or role: a11y_click_events_have_key_events, a11y_no_static_element_interactions), and
  // its ESLint config has no jsx-a11y to fail them, so plain svelte-check passed them while the
  // React app's prebuild lint failed the same markup (measured 2026-11-18 on a fresh scaffold:
  // 2 warnings, exit 0). Molecule's own Svelte packages build with --fail-on-warnings too.
  it('fails its build on the compiler warnings its type checker reports', async () => {
    const { scripts } = await manifest(framework)
    for (const name of ['build', 'typecheck'] as const)
      if (scripts[name]?.includes('svelte-check'))
        expect(scripts[name], `${name} must fail on Svelte's warnings`).toMatch(
          /svelte-check [^&]*--fail-on-warnings/,
        )
  })

  it('runs its mocked tests in Node, whatever its vite plugin prefers', async () => {
    // createFrameworkViteConfig sets test.environment: 'node' in the app's own config,
    // which a framework plugin's preference (vite-plugin-solid's jsdom) does not
    // override; nothing the scaffold adds may set another one.
    const config = await readFile(join(roots[framework], 'vite.config.ts'), 'utf8')
    expect(config).toContain('createFrameworkViteConfig(branding, {')
    expect(config).not.toMatch(/environment:/)
  })

  // The app's `lint` script runs simple-import-sort as a warning, so an unsorted import
  // in a framework template passes `npm run lint` and greets every new app with a
  // warning (Vue's Settings page did). The shared sorter keeps the same order.
  it('writes every import block in the order its own linter keeps', async () => {
    const unsorted: string[] = []
    for (const file of await sourceFiles(framework)) {
      const text = await readFile(join(roots[framework], file), 'utf8')
      const blocks = /\.(vue|svelte)$/.test(file)
        ? [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((match) => match[1])
        : [text]
      if (blocks.some((block) => importOrderProblems(block, file).length > 0)) unsorted.push(file)
    }
    expect(unsorted).toEqual([])
  })

  // Vite requests every literal warmup path whether or not the file exists, and logs
  // `Pre-transform error: Failed to load url /src/main.tsx` on every dev start when it
  // does not (a SvelteKit app did, with React's entry names).
  it('warms up only files it wrote', async () => {
    const config = await readFile(join(roots[framework], 'vite.config.ts'), 'utf8')
    // `warmup` is the server.warmup.clientFiles list createFrameworkViteConfig sets.
    const list = /\bwarmup:\s*\[([^\]]*)\]/.exec(config)?.[1]
    expect(list, 'vite.config.ts passes its warmup files').toBeDefined()
    const entries = [...(list ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1])
    expect(entries.length).toBeGreaterThan(0)
    const missing: string[] = []
    for (const entry of entries) {
      const slash = entry.lastIndexOf('/')
      const dir = join(roots[framework], entry.slice(0, slash))
      const name = entry.slice(slash + 1)
      const files = await readdir(dir).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return []
        throw error
      })
      const pattern = new RegExp(
        `^${name.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}$`,
      )
      if (!files.some((file) => pattern.test(file))) missing.push(entry)
    }
    expect(missing).toEqual([])
  })
})
