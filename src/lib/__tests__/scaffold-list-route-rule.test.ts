import { copyFile, mkdtemp, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { ESLint, type Rule, RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const template = fileURLToPath(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
)
const dir = await mkdtemp(join(tmpdir(), 'mlcl-list-route-rule-'))
const configPath = join(dir, 'eslint.config.mjs')
await copyFile(template, configPath)
await symlink(
  dirname(dirname(require.resolve('eslint/package.json'))),
  join(dir, 'node_modules'),
  'dir',
)
afterAll(() => rm(dir, { recursive: true, force: true }))

const config = (await import(pathToFileURL(configPath).href)).default as ReadonlyArray<{
  plugins?: Record<string, { rules: Record<string, Rule.RuleModule> }>
}>
const plugin = config.find((entry) => entry.plugins?.['molecule-local'])?.plugins?.[
  'molecule-local'
]
const rule = plugin?.rules['url-lists-use-list-route']
const ruleId = 'molecule-local/url-lists-use-list-route'

const home = `import { useSearchParams } from 'react-router'

export function Home() {
  const [searchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1)
  const showFollowing = searchParams.get('feed') === 'following'
  return <div>{page}:{String(showFollowing)}</div>
}
`

const catalog = `import { useSearchParams } from 'react-router-dom'

export function Catalog() {
  const [params] = useSearchParams()
  const category = params.get('category') ?? 'all'
  const sort = params.get('sort') ?? 'featured'
  const page = Number(params.get('page') ?? '1')
  return <div>{category}:{sort}:{page}</div>
}
`

describe('molecule-local/url-lists-use-list-route', () => {
  it('loads from the real template as a warning with the package-doc message', async () => {
    expect(rule).toBeDefined()
    const eslint = new ESLint({
      cwd: dir,
      overrideConfigFile: configPath,
      overrideConfig: { languageOptions: { parserOptions: { tsconfigRootDir: dir } } },
    })
    const [result] = await eslint.lintText(home, { filePath: 'Home.tsx' })
    const findings = result.messages.filter((message) => message.ruleId === ruleId)
    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({ severity: 1 })
    expect(findings[0]?.message).toBe(
      'Use `useListRoute` from `@molecule/app-routing-react-router` (see the package doc) so the URL and rendered list stay in step and paging and filter resets are handled.',
    )
  })

  if (rule) {
    const tester = new RuleTester({
      languageOptions: {
        parser: tseslint.parser,
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    })

    tester.run('url-lists-use-list-route', rule, {
      valid: [
        {
          name: 'a file already using useListRoute stays silent',
          filename: 'Catalog.tsx',
          code: `import { useListRoute } from '@molecule/app-routing-react-router'
import { useSearchParams } from 'react-router'
const list = useListRoute()
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'login navigation and credential query keys stay silent',
          filename: 'Login.tsx',
          code: `import { useSearchParams } from 'react-router'
const [params] = useSearchParams()
const returnTo = params.get('returnTo')
const redirect = params.get('redirect')
const token = params.get('token')
`,
        },
        {
          name: 'a type-only import creates no runtime search-params binding',
          filename: 'Types.tsx',
          code: `import type { useSearchParams } from 'react-router'
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'an inline type-only specifier creates no runtime binding',
          filename: 'Types.tsx',
          code: `import { type useSearchParams } from 'react-router-dom'
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
        {
          name: 'a same-named hook from another package stays silent',
          filename: 'Catalog.tsx',
          code: `import { useSearchParams } from './useSearchParams'
const [params] = useSearchParams()
const page = params.get('page')
`,
        },
      ],
      invalid: [
        {
          name: 'the l574 Home feed and page shape',
          filename: 'Home.tsx',
          code: home,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'a non-X1 product catalog with category, sort and page',
          filename: 'Catalog.tsx',
          code: catalog,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'an aliased React Router hook binding',
          filename: 'Feed.tsx',
          code: `import { useSearchParams as useUrlParams } from 'react-router'
const [params] = useUrlParams()
const tab = params.get('tab')
`,
          errors: [{ messageId: 'useListRoute' }],
        },
      ],
    })
  }
})
