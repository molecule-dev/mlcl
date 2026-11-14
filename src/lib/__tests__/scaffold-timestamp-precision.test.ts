/** Exercise the shipped ESLint config: timestamp serialization must retain milliseconds and UTC. */
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { ESLint } from 'eslint'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const shared = fileURLToPath(new URL('../../../templates/shared/', import.meta.url))
let dir: string
let eslint: ESLint

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'mlcl-timestamp-precision-'))
  await writeFile(
    join(dir, 'package.json'),
    JSON.stringify({
      type: 'module',
      dependencies: { '@molecule/api-resource': '1.0.0' },
    }),
  )
  await copyFile(join(shared, 'eslint.config.js.tpl'), join(dir, 'eslint.config.mjs'))
  await mkdir(join(dir, 'eslint-rules'))
  await copyFile(
    join(shared, 'prefer-declared-clients.mjs'),
    join(dir, 'eslint-rules/prefer-declared-clients.mjs'),
  )
  await copyFile(
    join(shared, 'no-empty-interactive-target.mjs'),
    join(dir, 'eslint-rules/no-empty-interactive-target.mjs'),
  )
  await copyFile(join(shared, 'no-class-code.mjs'), join(dir, 'eslint-rules/no-class-code.mjs'))
  await symlink(dirname(dirname(require.resolve('eslint/package.json'))), join(dir, 'node_modules'))
  eslint = new ESLint({
    cwd: dir,
    overrideConfigFile: join(dir, 'eslint.config.mjs'),
    overrideConfig: {
      languageOptions: { parserOptions: { tsconfigRootDir: dir } },
      rules: {
        'molecule-local/preserve-timestamp-precision': ['error', { fields: ['changedAt'] }],
      },
    },
  })
})

afterAll(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe('timestamp precision in the shared scaffold lint config', () => {
  it('allows datetime input formatting in an app, including one with API test tooling', async () => {
    const app = join(dir, 'app')
    await mkdir(app)
    await copyFile(join(shared, 'eslint.config.js.tpl'), join(app, 'eslint.config.mjs'))
    await symlink(join(dir, 'eslint-rules'), join(app, 'eslint-rules'))
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({
        type: 'module',
        dependencies: { '@molecule/app-http': '1.0.0' },
        devDependencies: { '@molecule/api-mock-server': '1.0.0' },
      }),
    )
    const appLint = new ESLint({
      cwd: app,
      overrideConfigFile: join(app, 'eslint.config.mjs'),
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: app } } },
    })
    const [result] = await appLint.lintText(
      'export const datetimeInput = new Date().toISOString().slice(0, 19)\n',
      { filePath: 'src/format.ts' },
    )
    expect(result.messages).toEqual([])
  })

  it('allows generic serializers and display values without a field precision contract', async () => {
    const [result] = await eslint.lintText(
      'export const display = new Date().toISOString().slice(0, 19)',
      { filePath: 'src/format.ts' },
    )
    expect(result.messages).toEqual([])
  })

  it.each(['slice', 'substring', 'substr'])(
    'rejects whole-second %s serialization for a job API',
    async (method) => {
      const [result] = await eslint.lintText(
        `export function jobDto(changedAt: Date): { changedAt: string } {\n  return { changedAt: changedAt.toISOString().${method}(0, 19) }\n}\n`,
        { filePath: 'src/handlers/jobs.ts' },
      )
      expect(result.messages.map(({ ruleId }) => ruleId)).toEqual([
        'molecule-local/preserve-timestamp-precision',
      ])
    },
  )

  it.each([20, 21, 22, 23])('rejects an incomplete timestamp of %i characters', async (length) => {
    const [result] = await eslint.lintText(
      `export const row = { changedAt: new Date().toISOString().slice(0, ${length}) }\n`,
      { filePath: 'src/jobs.ts' },
    )
    expect(result.messages.map(({ ruleId }) => ruleId)).toEqual([
      'molecule-local/preserve-timestamp-precision',
    ])
  })

  it.each([
    'new Date().toISOString()',
    'new Date().toISOString().slice(0, 10)',
    'new Date().toISOString().substring(0, 10)',
    'new Date().toISOString().slice(11, 19)',
    'new Date().toISOString().slice(0, 24)',
    'new Date().toISOString().slice(0)',
    'new Date().toISOString().slice(0, width)',
    "'an arbitrary string'.slice(0, 19)",
    "new Intl.DateTimeFormat('en-GB', { timeStyle: 'medium', timeZone: 'UTC' }).format(new Date())",
  ])(
    'allows full timestamps and intentional date, clock or unrelated string formatting: %s',
    async (expression) => {
      const [result] = await eslint.lintText(`export const row = { changedAt: ${expression} }\n`, {
        filePath: 'src/format.ts',
      })
      expect(result.messages).toEqual([])
    },
  )
})
