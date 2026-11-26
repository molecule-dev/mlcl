/**
 * `mlcl resources` records its clients in the workspace's ESLint config, whatever age the config
 * is: the short form that runs @molecule/eslint-config, a config that has the generated block but
 * still imports the rule from `./eslint-rules/`, and one written before the block existed.
 *
 * @module
 */

import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { writeResourceClientLint } from '../resource-client-lint.js'

const SHARED = join(import.meta.dirname, '../../../templates/shared')
const TEMPLATE = readFileSync(join(SHARED, 'eslint.config.js.tpl'), 'utf8')
const RULE = readFileSync(join(SHARED, 'prefer-generated-resource-clients.mjs'), 'utf8').replace(
  'Run mlcl resources',
  'Run npx mlcl resources',
)
const RULE_IMPORT =
  "import { generatedResourceClientConfig } from './eslint-rules/prefer-generated-resource-clients.mjs'"
const BLOCK =
  '// BEGIN GENERATED RESOURCE CLIENTS\n// prettier-ignore\nconst generatedResourceClients = []\n// END GENERATED RESOURCE CLIENTS'

/** A config with the generated block whose rule is imported from the workspace's own copy. */
const BLOCK_AND_LOCAL_RULE = `${RULE_IMPORT}

${BLOCK}

export default [...generatedResourceClientConfig(generatedResourceClients, import.meta.url)]
`

/** A config written before the generated block. */
const BEFORE_BLOCK = `import preferDeclaredClients, { scaffoldRules } from './eslint-rules/prefer-declared-clients.mjs'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { rules: { 'molecule-local/fetch-hooks-use-the-query-cache': 'warn' } },
)
`

let project: string

beforeEach(async () => {
  project = await mkdtemp(join(tmpdir(), 'resource-client-lint-'))
  await mkdir(join(project, 'app'), { recursive: true })
})

afterEach(async () => {
  await rm(project, { recursive: true, force: true })
})

/** Record one generated client for `GET /articles` in the app workspace. */
async function record(): Promise<void> {
  await writeResourceClientLint(
    project,
    'app',
    ['--contract', 'specs/openapi.json'],
    [
      {
        path: 'app/src/resources/articles.ts',
        routes: [{ path: '/articles', methods: 'GET', exportName: 'useArticles' }],
      },
    ],
    [],
    ['/articles', '/articles/{slug}'],
  )
}

const config = (): Promise<string> => readFile(join(project, 'app/eslint.config.js'), 'utf8')
const ruleCopy = join('app', 'eslint-rules', 'prefer-generated-resource-clients.mjs')

describe('writeResourceClientLint', () => {
  it('records the clients in the short form without copying a rule into the workspace', async () => {
    await writeFile(join(project, 'app/eslint.config.js'), TEMPLATE)
    await record()
    const written = await config()
    expect(written).toContain('"exportName": "useArticles"')
    expect(written).toContain('"uncovered": [\n      "/articles/{slug}"\n    ]')
    expect(written.replace(/\/\/ BEGIN[\s\S]*\/\/ END GENERATED RESOURCE CLIENTS/, BLOCK)).toBe(
      TEMPLATE,
    )
    expect(existsSync(join(project, 'app', 'eslint-rules'))).toBe(false)
  })

  it('supplies the rule a config with the block still imports from ./eslint-rules/', async () => {
    await writeFile(join(project, 'app/eslint.config.js'), BLOCK_AND_LOCAL_RULE)
    await record()
    expect(await config()).toContain('"exportName": "useArticles"')
    expect(await readFile(join(project, ruleCopy), 'utf8')).toBe(RULE)
  })

  it('adds the block, the rule import and the rule to a config from before the block', async () => {
    await writeFile(join(project, 'app/eslint.config.js'), BEFORE_BLOCK)
    await record()
    const written = await config()
    expect(written).toContain(RULE_IMPORT)
    expect(written).toContain('...generatedResourceClientConfig(')
    expect(written).toContain("'molecule-local/fetch-hooks-use-the-query-cache': 'error'")
    expect(await readFile(join(project, ruleCopy), 'utf8')).toBe(RULE)
  })

  it("keeps a workspace's own rule copy", async () => {
    await writeFile(join(project, 'app/eslint.config.js'), BLOCK_AND_LOCAL_RULE)
    await mkdir(join(project, 'app', 'eslint-rules'))
    await writeFile(join(project, ruleCopy), '// edited\n')
    await record()
    expect(await readFile(join(project, ruleCopy), 'utf8')).toBe('// edited\n')
  })
})
