/**
 * A project replaces scaffolded bonds: its design asks for another font, or it moves
 * to another HTTP client. The generated `bonds.test.ts` named every project bond file
 * through a typed `await import('../bonds/<file>.js')`, so deleting one failed the
 * project's type-check with TS2307 in a test the project never wrote. The executor
 * that hit it spent a redeploy and a second deployed walk restoring the bond file it
 * had correctly replaced (xr-molecule-flash-l2905, 2026-11-14).
 *
 * The generated test must type-check and pass after a bond is removed, and must still
 * fail when bonds/index.ts stops calling a setup whose bond file remains.
 *
 * @module
 */

import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import * as prettier from 'prettier'
import ts from 'typescript'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { InjectionPlan } from '../injector.js'
import { synthesizeAppProjectFiles } from '../injector.js'
import { loadRegistry } from '../registry.js'
import { getTemplatesDir } from '../scaffold.js'

const MLCL_ROOT = join(import.meta.dirname, '..', '..', '..')

const base: InjectionPlan = {
  molecule: '@molecule/app-auth',
  moleculePackage: {
    name: '@molecule/app-auth',
    version: '1.0.0',
    type: 'core',
    routes: [],
    tables: [],
    exports: [],
    path: '/tmp/test-app',
  },
  files: [],
  dependencies: [],
  migrations: [],
  bondSetup: null,
  conflicts: [],
}

/** A plan whose bond setup bonds/index.ts imports from a project bond file. */
function bondPlan(provider: string, core: string, type: string): InjectionPlan {
  return {
    ...base,
    molecule: provider,
    moleculePackage: { ...base.moleculePackage, name: provider },
    bondSetup: {
      providerPackage: provider,
      interfacePackage: core,
      interfaceType: type,
      setupCode: '',
    },
  }
}

const molecules = [
  '@molecule/app-fonts',
  '@molecule/app-fonts-arimo',
  '@molecule/app-http',
  '@molecule/app-theme',
  '@molecule/app-theme-css-variables',
  '@molecule/http-client-fetch',
]

/** The generated files, keyed by their path under the project's `src/`. */
function generated(
  plans: InjectionPlan[] = [
    bondPlan('@molecule/http-client-fetch', '@molecule/app-http', 'http'),
    bondPlan('@molecule/app-fonts-arimo', '@molecule/app-fonts', 'fonts'),
    bondPlan('@molecule/app-theme-css-variables', '@molecule/app-theme', 'theme'),
  ],
  installed: string[] = molecules,
): Map<string, string> {
  const files = synthesizeAppProjectFiles(plans, installed, '/tmp/test-app', loadRegistry())
  return new Map(
    files.map((file) => [file.targetPath.replace(/^\/tmp\/test-app\/src\//, ''), file.content]),
  )
}

/**
 * The provider bond files a scaffold copies from each package, and the config the
 * generated HTTP bond reads. Only the generated test file is type-checked below.
 */
const providerBonds: Record<string, string> = {
  'config.ts': "export const API_BASE_URL = ''\n",
  'bonds/http-client-fetch.ts': [
    "import { setClient } from '@molecule/app-http'",
    '',
    "export const httpClient = { kind: 'fetch' }",
    '',
    'export function setupHttpClientFetch(): void {',
    '  setClient(httpClient)',
    '}',
    '',
  ].join('\n'),
  'bonds/app-fonts-arimo.ts': 'export function setupAppFontsArimo(): void {}\n',
  'bonds/app-theme-css-variables.ts': [
    "import { setProvider } from '@molecule/app-theme'",
    '',
    "export const themeProvider = { kind: 'css-variables' }",
    '',
    'export function setupAppThemeCssVariables(): void {',
    '  setProvider(themeProvider)',
    '}',
    '',
  ].join('\n'),
}

const vitestEntry = join(
  dirname(createRequire(import.meta.url).resolve('vitest/package.json')),
  'vitest.mjs',
)

let root = ''

/** Run the project's own bonds test with vitest; returns the exit status and output. */
function runProjectTest(): { status: number | null; output: string } {
  const run = spawnSync(process.execPath, [vitestEntry, 'run', '--root', root], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', CI: '1' },
    timeout: 120_000,
  })
  return { status: run.status, output: `${run.stdout}\n${run.stderr}` }
}

/** Type errors the compiler reports in the generated test file itself. */
function testFileTypeErrors(): string[] {
  const testFile = join(root, 'src', '__tests__', 'bonds.test.ts')
  const program = ts.createProgram([testFile], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: true,
    skipLibCheck: true,
    noEmit: true,
    noUnusedLocals: true,
    lib: ['lib.dom.d.ts', 'lib.es2022.d.ts'],
    types: ['vite/client'],
  })
  const source = program.getSourceFile(testFile)!
  return [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source),
  ].map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`)
}

describe('generated bonds smoke test after a project replaces a bond', () => {
  const files = generated()
  const bondsTest = files.get('__tests__/bonds.test.ts')!
  const bondsIndex = files.get('bonds/index.ts')!

  beforeAll(async () => {
    await mkdir(join(MLCL_ROOT, '.tmp'), { recursive: true })
    // Inside the checkout, so vitest, vite and the @molecule packages resolve.
    root = await mkdtemp(join(MLCL_ROOT, '.tmp', 'bonds-swap-'))
    for (const [path, content] of [...files, ...Object.entries(providerBonds)]) {
      await mkdir(dirname(join(root, 'src', path)), { recursive: true })
      await writeFile(join(root, 'src', path), content)
    }
    await writeFile(join(root, 'package.json'), '{ "type": "module", "private": true }\n')
  })

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })

  it('names no project bond file through a typed import', () => {
    expect(bondsIndex).toContain("import { setupAppFontsArimo } from './app-fonts-arimo.js'")
    const typedBondImports = bondsTest.match(/import\('\.\.\/bonds\/(?!index\.js')[^']+'\)/g)
    expect(typedBondImports).toBeNull()
  })

  it('is a formatter fixed point', async () => {
    const config = JSON.parse(
      await readFile(join(getTemplatesDir(), 'app', 'shared', 'prettierrc.json.tpl'), 'utf8'),
    )
    expect(bondsTest).toBe(await prettier.format(bondsTest, { ...config, parser: 'typescript' }))
    // One wired project bond: the list still breaks, as prettier prints it.
    const single = generated(
      [bondPlan('@molecule/app-fonts-arimo', '@molecule/app-fonts', 'fonts')],
      ['@molecule/app-fonts', '@molecule/app-fonts-arimo'],
    ).get('__tests__/bonds.test.ts')!
    expect(single).toContain("['../bonds/app-fonts-arimo.ts', 'setupAppFontsArimo'],")
    expect(single).toBe(await prettier.format(single, { ...config, parser: 'typescript' }))
  })

  it('passes and type-checks as scaffolded, and after a bond is removed', async () => {
    const scaffolded = runProjectTest()
    expect(scaffolded.output).toMatch(/Tests\s+\d+ passed/)
    expect(scaffolded.status).toBe(0)
    expect(testFileTypeErrors()).toEqual([])

    // The project serves its design's own font instead of the scaffold's default.
    await unlink(join(root, 'src', 'bonds', 'app-fonts-arimo.ts'))
    await writeFile(
      join(root, 'src', 'bonds', 'index.ts'),
      bondsIndex
        .replace("import { setupAppFontsArimo } from './app-fonts-arimo.js'\n", '')
        .replace('  setupAppFontsArimo()\n', ''),
    )
    const replaced = runProjectTest()
    expect(replaced.output).toMatch(/Tests\s+\d+ passed/)
    expect(replaced.status).toBe(0)
    expect(testFileTypeErrors()).toEqual([])
  }, 240_000)

  it('still fails when bonds/index.ts stops calling a setup whose bond file remains', async () => {
    await writeFile(
      join(root, 'src', 'bonds', 'app-fonts-arimo.ts'),
      providerBonds['bonds/app-fonts-arimo.ts'],
    )
    await writeFile(
      join(root, 'src', 'bonds', 'index.ts'),
      bondsIndex.replace('  setupAppFontsArimo()\n', ''),
    )
    const unwired = runProjectTest()
    expect(unwired.status).not.toBe(0)
    expect(unwired.output).toContain('setupAppFontsArimo in ../bonds/app-fonts-arimo.ts')
  }, 120_000)
})
