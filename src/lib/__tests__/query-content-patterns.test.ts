// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import * as router from 'react-router'
import ts from 'typescript'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { resetQueryClient, setProvider } from '@molecule/app-query'
import { provider } from '@molecule/app-query-memory'
import * as query from '@molecule/app-query-react'

const t = (_key: string, _values: unknown, options: { defaultValue: string }): string =>
  options.defaultValue
const cm = new Proxy(
  {},
  { get: (_target, key) => (key === 'cn' ? (...values: string[]) => values.join(' ') : () => '') },
)
let http: { get: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }
beforeEach(() => {
  setProvider(provider)
  resetQueryClient()
  http = { get: vi.fn(), put: vi.fn() }
})
afterEach(cleanup)
function compile(source: string, name: string): react.ComponentType {
  const result = ts.transpileModule(source, {
    fileName: 'consumer.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports: Record<string, react.ComponentType> = {}
  const imports: Record<string, unknown> = {
    react,
    'react/jsx-runtime': jsx,
    'react-router': router,
    '@molecule/app-query-react': query,
    '@molecule/app-react': { useHttpClient: () => http, useTranslation: () => ({ t }) },
    '@molecule/app-http': {
      unwrapList: (response: { data: unknown }) => response.data,
      unwrapSingle: (response: { data: unknown }) => response.data,
    },
    '@molecule/app-ui': { getClassMap: () => cm },
    '@molecule/app-analytics': { track: vi.fn() },
    '../lib/unwrap.js': { unwrapSingle: (response: { data: unknown }) => response.data },
  }
  new Function('require', 'exports', result.outputText)((id: string) => {
    if (!(id in imports)) throw Error('Unexpected import ' + id)
    return imports[id]
  }, exports)
  return exports[name]!
}
function pattern(file: string, name: string): react.ComponentType {
  const text = readFileSync(
    join(import.meta.dirname, '../../../templates/.agents/skills/patterns', file),
    'utf8',
  )
  return compile(text.match(/```tsx\n([\s\S]*?)```/)![1]!, name)
}
function route(page: react.ComponentType): void {
  render(
    react.createElement(
      router.MemoryRouter,
      { initialEntries: ['/posts/one'] },
      react.createElement(
        router.Routes,
        {},
        react.createElement(router.Route, {
          path: '/posts/:id',
          element: react.createElement(page),
        }),
      ),
    ),
  )
}

it('the shipped list recipe renders status outside item structure and releases real items', async () => {
  let resolve!: (value: unknown) => void
  http.get.mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  route(pattern('list-fetch.md', 'PostList'))
  expect(screen.queryByRole('list')).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('Loading')
  await act(async () => resolve({ data: [{ id: 'one', title: 'A book', excerpt: 'Ready' }] }))
  expect(screen.getAllByRole('listitem')).toHaveLength(1)
  expect(screen.getByRole('link').getAttribute('href')).toBe('/posts/one')
})

it('the shipped detail recipe hides its edit action until the record loads', async () => {
  let resolve!: (value: unknown) => void
  http.get.mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  route(pattern('item-detail-fetch.md', 'PostDetail'))
  expect(screen.queryByRole('link', { name: 'Edit post' })).toBeNull()
  await act(async () => resolve({ data: { id: 'one', title: 'A book', body: 'Ready' } }))
  expect(screen.getByRole('link', { name: 'Edit post' }).getAttribute('href')).toBe(
    '/posts/one/edit',
  )
})

it('counterexample: the accounting flagship already keeps Mark paid unavailable while its invoice loads', async () => {
  let resolve!: (value: unknown) => void
  http.get.mockReturnValue(
    new Promise((r) => {
      resolve = r
    }),
  )
  const Page = compile(
    readFileSync(
      join(
        import.meta.dirname,
        '../../../templates/apps/accounting-invoicing/app/src/pages/InvoiceDetail.tsx',
      ),
      'utf8',
    ),
    'InvoiceDetail',
  )
  const invoices = JSON.parse(
    readFileSync(
      join(
        import.meta.dirname,
        '../../../templates/apps/accounting-invoicing/api/fixtures/invoices.json',
      ),
      'utf8',
    ),
  )
  route(Page)
  expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull()
  await act(async () => resolve({ data: invoices[0] }))
  http.put.mockResolvedValue({ data: { ...invoices[0], status: 'paid' } })
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Mark paid' })))
  expect(http.put).toHaveBeenCalledExactlyOnceWith(
    '/api/invoices/' + invoices[0].id,
    expect.objectContaining({ status: 'paid' }),
  )
  expect(screen.queryByRole('button', { name: 'Mark paid' })).toBeNull()
})
