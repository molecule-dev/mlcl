// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import * as router from 'react-router'
import ts from 'typescript'
import { afterEach, expect, it, vi } from 'vitest'

import { useListRoute } from '@molecule/app-routing-react-router'
import { TabFilter } from '@molecule/app-tab-filter-react'

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () =>
    new Proxy(
      {},
      { get: (_target, key) => (key === 'cn' ? (...args: string[]) => args.join(' ') : () => '') },
    ),
}))
afterEach(cleanup)

function example(file: string, exported: string): react.ElementType {
  const text = readFileSync(
    join(import.meta.dirname, '../../../templates/.agents/skills/patterns', file),
    'utf8',
  )
  const source = [...text.matchAll(/```tsx\n([\s\S]*?)```/g)]
    .map((m) => m[1]!)
    .find((code) => code.includes(`export function ${exported}`))
  if (!source) throw Error('Missing executable example ' + exported)
  const output = ts.transpileModule(source, {
    fileName: 'example.tsx',
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports: Record<string, react.ElementType> = {}
  const imports: Record<string, unknown> = {
    react,
    'react/jsx-runtime': jsx,
    '@molecule/app-tab-filter-react': { TabFilter },
    '@molecule/app-routing-react-router': { useListRoute },
  }
  new Function('require', 'exports', output)((id: string) => {
    if (!(id in imports)) throw Error('Unexpected import ' + id)
    return imports[id]
  }, exports)
  return exports[exported]!
}

// A real non-X1 template's route graph supplies this consumer's collection path.
const blog = readFileSync(
  join(import.meta.dirname, '../../../templates/apps/blog/app/src/App.tsx'),
  'utf8',
)
const collectionPath = blog.match(/<Route path="([^"]+)" element={<PostList/)?.[1]
it('the collection recipe returns from Blog filtered page two and preserves browser history', async () => {
  expect(collectionPath).toBe('/posts')
  const Views = example('pagination.md', 'CollectionViews')
  const Location = (): react.ReactElement =>
    react.createElement('output', {}, router.useLocation().pathname + router.useLocation().search)
  const Back = (): react.ReactElement => {
    const navigate = router.useNavigate()
    return react.createElement('button', { onClick: () => navigate(-1) }, 'Back')
  }
  render(
    react.createElement(
      router.MemoryRouter,
      { initialEntries: [collectionPath + '?view=filtered&page=2'] },
      react.createElement(
        react.Fragment,
        {},
        react.createElement(Views, {
          path: collectionPath,
          labels: { all: 'All posts', filtered: 'Saved posts' },
        }),
        react.createElement(Location),
        react.createElement(Back),
      ),
    ),
  )
  expect(screen.getByRole('tab', { name: 'Saved posts' }).getAttribute('aria-selected')).toBe(
    'true',
  )
  fireEvent.click(screen.getByRole('tab', { name: 'All posts' }))
  expect(screen.getByRole('status').textContent).toBe('/posts')
  expect(screen.queryByRole('tab', { name: 'Saved posts' })).toBeNull()
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Back' })))
  expect(screen.getByRole('status').textContent).toBe('/posts?view=filtered&page=2')
  expect(screen.getByRole('tab', { name: 'All posts' })).toBeTruthy()
})

it('counterexample: an ordinary tab row has only the tabs the application supplies', () => {
  const onChange = vi.fn()
  render(
    react.createElement(TabFilter, {
      tabs: [
        { id: 'compact', label: 'Compact' },
        { id: 'expanded', label: 'Expanded' },
      ],
      activeId: 'compact',
      onChange,
    }),
  )
  expect(screen.getAllByRole('tab')).toHaveLength(2)
  fireEvent.click(screen.getByRole('tab', { name: 'Expanded' }))
  expect(onChange).toHaveBeenCalledWith('expanded')
})
