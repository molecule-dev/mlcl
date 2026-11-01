import { copyFile, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { ESLint, type Rule, RuleTester } from 'eslint'
import tseslint from 'typescript-eslint'
import { afterAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const template = fileURLToPath(
  new URL('../../../templates/shared/eslint.config.js.tpl', import.meta.url),
)
const tmp = join(import.meta.dirname, '../../../.tmp')
await mkdir(tmp, { recursive: true })
const dir = await mkdtemp(join(tmp, 'mlcl-list-route-rule-'))
const configPath = join(dir, 'eslint.config.mjs')
await copyFile(template, configPath)
await mkdir(join(dir, 'eslint-rules'))
await copyFile(
  join(import.meta.dirname, '../../../templates/shared/prefer-declared-clients.mjs'),
  join(dir, 'eslint-rules/prefer-declared-clients.mjs'),
)
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

const home = `import { useState } from 'react'

export function Home() {
  const [category, setCategory] = useState('all')
  const visible = products.filter((product) => category === 'all' || product.category === category)
  return <ProductList items={visible} category={category} onCategory={setCategory} />
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
          name: 'Settings reads tab only to choose a form',
          filename: 'Settings.tsx',
          code: `import { useSearchParams } from 'react-router'
export function Settings() {
  const [params] = useSearchParams()
  const tab = params.get('tab')
  if (tab === 'billing') return <BillingForm />
  return <ProfileForm />
}
`,
        },
        {
          name: 'a nested helper reads topic only to build a share URL',
          filename: 'Share.tsx',
          code: `import { useSearchParams } from 'react-router'
export function SharePage() {
  const [params] = useSearchParams()
  const buildShareUrl = () => '/share?topic=' + (params.get('topic') ?? '')
  return <a href={buildShareUrl()}>Share</a>
}
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
          name: 'a redirect value is not list state',
          filename: 'Login.tsx',
          code: `import { useNavigate, useSearchParams } from 'react-router'
export function Login() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const returnTo = params.get('returnTo') ?? '/'
  return <button onClick={() => navigate(returnTo)}>Continue</button>
}
`,
        },
        {
          name: 'a reset token copied into a form field is not list state',
          filename: 'ResetPassword.tsx',
          code: `import { useState } from 'react'
import { useSearchParams } from 'react-router'
export function ResetPassword() {
  const [params] = useSearchParams()
  const [token] = useState(params.get('token') || '')
  return <input value={token} />
}
`,
        },
        {
          name: 'an upload album preselection is not a rendered list filter',
          filename: 'Upload.tsx',
          code: `import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
export function Upload() {
  const [params] = useSearchParams()
  const initial = params.get('album_id') ?? ''
  const [album] = useState(initial)
  useEffect(() => {
    listAlbums({ owner: 'me' }).then((items) => {
      if (initial && !items.some((item) => item.id === initial)) return null
      return items
    })
  }, [initial])
  return <select value={album} />
}
`,
        },
        {
          name: 'a token in a tracking fetch path is not a list request',
          filename: 'PublicIssue.tsx',
          code: `import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
export function PublicIssue() {
  const [params] = useSearchParams()
  const token = params.get('t') ?? ''
  useEffect(() => {
    if (token) fetch('/api/issues/open/' + encodeURIComponent(token))
  }, [token])
  return <article />
}
`,
        },
        {
          name: 'an analytics range chip is not list evidence',
          filename: 'Analytics.tsx',
          code: `import { useSearchParams } from 'react-router'
export function Analytics() {
  const [params] = useSearchParams()
  const range = params.get('range') ?? '7d'
  return <button aria-pressed={range === '7d'}>Last 7 days</button>
}
`,
        },
        {
          name: 'a prompt style chip is not list evidence',
          filename: 'PromptComposer.tsx',
          code: `import { useLocation } from 'react-router'
export function PromptComposer() {
  const params = new URLSearchParams(useLocation().search)
  const style = params.get('style') ?? 'photoreal'
  const active = style === 'anime'
  return <button aria-pressed={active}>Anime</button>
}
`,
        },
        {
          name: 'a payment return translation is not list evidence',
          filename: 'PlanUpdated.tsx',
          code: `import { useSearchParams } from 'react-router'
export function PlanUpdated() {
  const [params] = useSearchParams()
  const planKey = params.get('planKey')
  return <p>{t('planUpdated.confirmed', { planKey })}</p>
}
`,
        },
        {
          name: 'a passenger count in a pricing memo is not a list operation',
          filename: 'Booking.tsx',
          code: `import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
export function Booking() {
  const [params] = useSearchParams()
  const passengers = Number(params.get('passengers') ?? '1')
  const total = useMemo(() => price * passengers, [price, passengers])
  return <><p>{total}</p><dd>×{passengers}</dd></>
}
`,
        },
        {
          name: 'hook-managed filter state controlling the same list stays silent',
          filename: 'Catalog.tsx',
          code: `import { useListRoute } from '@molecule/app-routing-react-router'
export function Catalog() {
  const route = useListRoute({ filters: { category: {} } })
  const category = route.filters.category ?? 'all'
  const visible = products.filter((p) => category === 'all' || p.category === category)
  return <ProductList items={visible} category={category} />
}
`,
        },
        {
          name: 'editable email prefill in a form preview is not a list consumer',
          filename: 'Compose.tsx',
          code: `import { useState } from 'react'
import { useSearchParams } from 'react-router'
export function Compose() {
  const [params] = useSearchParams()
  const [recipient, setRecipient] = useState(params.get('to') ?? '')
  const [subject, setSubject] = useState(params.get('subject') ?? '')
  return <><EmailPreview recipient={recipient} subject={subject} onRecipient={setRecipient} onSubject={setSubject} /><pre>{recipient}:{subject}</pre></>
}
`,
        },
        {
          name: 'generic analytics and detail queries are not list-fetching hooks',
          filename: 'Analytics.tsx',
          code: `import { useSearchParams } from 'react-router'
export function Analytics() {
  const [params] = useSearchParams()
  const range = params.get('range') ?? '7d'
  const id = params.get('id') ?? ''
  const analytics = useQuery({ queryKey: ['analytics', range] })
  const detail = useQuery({ queryKey: ['product', id] })
  return <Dashboard analytics={analytics} detail={detail} />
}
`,
        },
        {
          name: 'cross-file re-exports wrappers and URL prop chains are out of scope',
          filename: 'Catalog.tsx',
          code: `import { useFilters } from './router'
export function Catalog() {
  const params = useFilters()
  return <ProductList sort={params.get('sort')} />
}
`,
        },
        {
          name: 'local state consumed by a non-list form stays silent',
          filename: 'Profile.tsx',
          code: `import { useState } from 'react'
export function Profile() {
  const [name, setName] = useState('Ada')
  return <ProfileForm name={name} onName={setName} />
}
`,
        },
        {
          name: 'loading refresh keys result metadata and retry closures are not URL list state',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const result = useProducts({ refreshKey })
  return <ProductList loading={loading} totalPages={totalPages} onRetry={() => reload(refreshKey)} />
}
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
          name: 'a local useState filter controls a same-file product list',
          filename: 'Home.tsx',
          code: home,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'a useListRoute import does not exempt an unrelated local filter',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
import { useListRoute } from '@molecule/app-routing-react-router'
export function Catalog() {
  const route = useListRoute()
  const [category, setCategory] = useState('all')
  const visible = products.filter((p) => category === 'all' || p.category === category).slice(route.offset, route.offset + route.limit)
  return <ProductList items={visible} category={category} onCategory={setCategory} />
}
`,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'a non-X1 local filter is passed to a list-fetching hook in the same file',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [category, setCategory] = useState('all')
  const result = useProducts({ category })
  return <ProductList items={result.data} category={category} onCategory={setCategory} />
}
`,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'local state passed to a list component prop warns without array operations',
          filename: 'Catalog.tsx',
          code: `import { useState } from 'react'
export function Catalog() {
  const [sort, setSort] = useState('featured')
  return <ProductList sort={sort} onSort={setSort} />
}
`,
          errors: [{ messageId: 'useListRoute' }],
        },
        {
          name: 'a URL-initialized local filter still warns when it controls a list consumer',
          filename: 'Issues.tsx',
          code: `import { useState } from 'react'
import { useSearchParams } from 'react-router'
export function Issues() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? 'all')
  return <IssueList status={status} onStatus={setStatus} />
}
`,
          errors: [{ messageId: 'useListRoute' }],
        },
      ],
    })
  }
})
