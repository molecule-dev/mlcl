/**
 * The config template every scaffolded workspace receives must lint itself without errors: the
 * platform's format pass runs ESLint over every shipped file, the config included. Its rules are
 * tested in @molecule/eslint-config.
 *
 * @module
 */

import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { copySharedEslintRules } from './shared-eslint-rules.js'

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
  await copySharedEslintRules(dir)
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
