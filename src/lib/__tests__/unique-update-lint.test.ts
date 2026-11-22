import { mkdtemp, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { ESLint } from 'eslint'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { createApiProject } from '../scaffold.js'

const require = createRequire(import.meta.url)
const RULE = 'molecule-local/unique-update-excludes-self'
let dir: string

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'unique-update-lint-'))
})

afterAll(async () => {
  if (dir) await rm(dir, { recursive: true, force: true })
})

const inventory = (
  queryExtra = '',
  returned = 'Boolean(found)',
  check = 'await codeTaken(code)',
): string => `
import { findOne, updateById } from '@molecule/api-database'
async function codeTaken(code: string, exceptId?: string) {
  const found = await findOne('inventory', [
    { field: 'code', operator: '=', value: code },
    ${queryExtra}
  ])
  return ${returned}
}
export async function save(id: string, code: string, res: Response, current: { id: string; code: string }, req: { params: { id: string } }, otherCode: string, mode: string) {
  if (${check}) {
    res.status(409).json({ error: 'Code has already been taken' })
    return
  }
  await updateById('inventory', id, { code })
}
`

describe('unique update checks in the shipped ESLint config', () => {
  it('delivers the check through the actual API scaffolder', async () => {
    const api = join(dir, 'generated-api')
    await createApiProject(api, 'warehouse')
    await symlink(
      dirname(dirname(require.resolve('eslint/package.json'))),
      join(api, 'node_modules'),
    )
    const checker = new ESLint({
      cwd: api,
      overrideConfigFile: join(api, 'eslint.config.js'),
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: api } } },
    })
    const [result] = await checker.lintText(inventory(), { filePath: join(api, 'src/save.ts') })
    expect(result.fatalErrorCount).toBe(0)
    expect(result.messages.filter((message) => message.ruleId === RULE)).toHaveLength(1)
  })
})
