/**
 * The config template every scaffolded workspace receives must lint itself without errors: the
 * platform's format pass runs ESLint over every shipped file, the config included. Its rules are
 * tested in @molecule/eslint-config.
 *
 * @module
 */

import { existsSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { getMoleculeVersion, loadToolchain } from '../registry.js'
import { createAppProject } from '../scaffold.js'

const require = createRequire(import.meta.url)

/** The one config every scaffolded workspace receives. */
const TEMPLATE = fileURLToPath(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
)

/** The node_modules the config's own imports resolve from. */
const NODE_MODULES = dirname(dirname(require.resolve('eslint/package.json')))

let dir: string
let eslint: ESLint

beforeEach(async () => {
  const tmp = process.env.TMPDIR ?? join(import.meta.dirname, '../../../.tmp')
  await mkdir(tmp, { recursive: true })
  dir = await mkdtemp(join(tmp, 'mlcl-eslint-config-'))
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@molecule/app-react': '1.0.0',
        '@molecule/app-routing-react-router': '1.0.0',
      },
    }),
  )
  // The .tpl's extension is not loadable as a config file, and its bare
  // imports have to resolve from a directory under node_modules — so it is
  // copied to .mjs next to a link to the installed tree.
  await copyFile(TEMPLATE, join(dir, 'eslint.config.mjs'))
  await symlink(NODE_MODULES, join(dir, 'node_modules'), 'dir')
  eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: join(dir, 'eslint.config.mjs'),
    // typescript-estree accumulates one candidate tsconfig root per temp
    // directory it has parsed in a process, and refuses to infer with more than
    // one. Each linted file gets an explicit root; nothing about the RULES under
    // test changes.
    overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
  })
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('the shared scaffold eslint config', () => {
  // Every project ships this file as `eslint.config.js`, and the platform's format pass runs
  // ESLint over every shipped file, the config included (`npm run lint` covers only `src`). An
  // error here reached every project unseen (a `no-useless-escape` in the router-import regex).
  it('lints itself without errors', async () => {
    const [result] = await eslint.lintText(await readFile(TEMPLATE, 'utf8'), {
      filePath: join(dir, 'eslint.config.js'),
    })
    expect(
      result.messages
        .filter((message) => message.severity === 2)
        .map((message) => `${message.line}: ${message.ruleId ?? message.message}`),
    ).toEqual([])
  })
})

/** The plugins @molecule/eslint-config brings, which a scaffold therefore no longer declares. */
const BROUGHT = [
  '@eslint/js',
  'eslint-config-prettier',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react-hooks',
  'eslint-plugin-simple-import-sort',
  'typescript-eslint',
]

describe('what a scaffolded workspace receives', () => {
  it('a config that imports only @molecule/eslint-config', async () => {
    const text = await readFile(TEMPLATE, 'utf8')
    expect([...text.matchAll(/^import\b[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1])).toEqual([
      '@molecule/eslint-config',
    ])
  })

  // The config switches framework rules on from the workspace's own devDependencies, so a Vue or
  // Svelte app must still declare its plugins, and every app the config package and eslint.
  it.each([
    ['react', []],
    ['vue', ['eslint-plugin-vue', 'eslint-plugin-vuejs-accessibility', 'vue-eslint-parser']],
    ['svelte', ['eslint-plugin-svelte']],
  ] as const)(
    'a %s app declares the config package at the registry pin, eslint and its framework plugins',
    async (framework, plugins) => {
      const app = join(dir, 'generated-' + framework)
      await createAppProject(app, 'equipment-console', framework)
      expect(await readFile(join(app, 'eslint.config.js'), 'utf8')).toBe(
        await readFile(TEMPLATE, 'utf8'),
      )
      expect(existsSync(join(app, 'eslint-rules'))).toBe(false)
      const { devDependencies = {} } = JSON.parse(await readFile(join(app, 'package.json'), 'utf8'))
      expect(devDependencies['@molecule/eslint-config']).toBe(
        getMoleculeVersion('@molecule/eslint-config'),
      )
      expect(devDependencies.eslint).toBe(loadToolchain().shared.eslint)
      for (const plugin of plugins) expect(devDependencies[plugin], plugin).toBeDefined()
      for (const plugin of BROUGHT) expect(devDependencies[plugin], plugin).toBeUndefined()
    },
    120_000,
  )
})
