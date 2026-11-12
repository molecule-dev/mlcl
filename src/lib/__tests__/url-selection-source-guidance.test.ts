// @vitest-environment jsdom

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Link, Route, Routes, useLocation, useNavigate } from 'react-router'
import ts from 'typescript'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { configureQueryClient, resetQueryClient, setProvider } from '@molecule/app-query'
import { provider as memoryQuery } from '@molecule/app-query-memory'
import { useQuery } from '@molecule/app-query-react'
import {
  type ListRouteAuth,
  type ListRouteResult,
  MemoryRouter,
  useListRoute,
} from '@molecule/app-routing-react-router'

import { stampCapabilitySourceHeaders } from '../capability-map.js'
import { addPackages, createAppProject, ensureAgentsMd } from '../scaffold.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let directory: string
let header: string
let root: Root | undefined
let host: HTMLDivElement | undefined
const binding = '@molecule/app-routing-react-router'
const marker = '@molecule/capability-recipes:start'

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'url-selection-recipes-'))
  const custom = join(directory, 'custom')
  await createAppProject(custom, 'order-directory', 'react')
  await addPackages(custom, [binding, '@molecule/app-query-react'])
  await ensureAgentsMd(custom)
  header = await readFile(join(custom, 'src/App.tsx'), 'utf8')
}, 30000)

afterAll(async () => {
  await rm(directory, { recursive: true, force: true })
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  host?.remove()
  host = undefined
  resetQueryClient()
  configureQueryClient(undefined)
})

/** Execute the actual source recipe, rather than a hand-written equivalent of it. */
function protectedRecipe(source = header): string {
  const recipe = source.match(/`(const list = useListRoute\([^`]+)`/)?.[1]
  expect(
    recipe,
    'editable app source must deliver the protected URL-selection recipe',
  ).toBeDefined()
  return recipe!
}

/** A real query and router consuming the recipe delivered by the scaffold. */
async function mount(
  initial: string,
  initialStatus: ListRouteAuth['status'],
): Promise<{
  list: () => ListRouteResult<string, 'all' | 'mine'>
  url: () => string
  state: () => unknown
  fetch: ReturnType<typeof vi.fn>
  setStatus: (next: ListRouteAuth['status']) => Promise<void>
  back: () => Promise<void>
  selectMine: () => Promise<void>
}> {
  const recipe = new Function(
    'useListRoute',
    'routeAuthStatus',
    protectedRecipe() + '; return list',
  ) as (
    hook: typeof useListRoute,
    status: ListRouteAuth['status'],
  ) => ListRouteResult<string, 'all' | 'mine'>
  let status = initialStatus
  let list!: ReturnType<typeof recipe>
  let location!: ReturnType<typeof useLocation>
  let navigate!: ReturnType<typeof useNavigate>
  const fetch = vi.fn(async (selection: unknown) => selection)
  resetQueryClient()
  setProvider(memoryQuery)
  configureQueryClient({ gcMs: 0 })

  function Location(): null {
    location = useLocation()
    navigate = useNavigate()
    return null
  }

  function Orders(): ReactNode {
    list = recipe(useListRoute, status)
    useQuery(
      list.canLoad ? { key: ['orders', list.selection], fetch: () => fetch(list.selection) } : null,
    )
    return createElement(Link, { to: list.href({ selection: 'mine' }), id: 'mine' }, 'Mine')
  }

  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const render = async (): Promise<void> => {
    await act(async () => {
      root!.render(
        createElement(
          MemoryRouter,
          { initialEntries: ['/previous', initial], initialIndex: 1 },
          createElement(Location),
          createElement(
            Routes,
            null,
            createElement(Route, { path: '/orders', element: createElement(Orders) }),
            createElement(Route, {
              path: '*',
              element: createElement('output', null, 'Other page'),
            }),
          ),
        ),
      )
    })
  }
  await render()
  return {
    list: () => list,
    url: () => location.pathname + location.search + location.hash,
    state: () => location.state as unknown,
    fetch,
    setStatus: async (next: ListRouteAuth['status']) => {
      status = next
      await render()
    },
    back: async () => {
      await act(async () => {
        await navigate(-1)
      })
    },
    selectMine: async () => {
      await act(async () => {
        host!.querySelector<HTMLAnchorElement>('#mine')!.click()
      })
    },
  }
}

describe('URL selections delivered beside editable React source', () => {
  it('delivers the binding recipe even when its interface is only a peer dependency', async () => {
    const app = join(directory, 'binding-only')
    await mkdir(join(app, 'src'), { recursive: true })
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({ dependencies: { [binding]: '1.2.5' } }),
    )
    const body =
      "import { BrowserRouter } from '@molecule/app-routing-react-router'\nexport { BrowserRouter }\n"
    await writeFile(join(app, 'src/App.tsx'), body)
    await ensureAgentsMd(app)
    const source = await readFile(join(app, 'src/App.tsx'), 'utf8')
    protectedRecipe(source)
    expect(source.endsWith(body)).toBe(true)
    expect(source.split(marker)).toHaveLength(2)
    await ensureAgentsMd(app)
    expect(await readFile(join(app, 'src/App.tsx'), 'utf8')).toBe(source)
    await writeFile(join(app, 'package.json'), '{}')
    await stampCapabilitySourceHeaders(app)
    expect(await readFile(join(app, 'src/App.tsx'), 'utf8')).toBe(body)
  })

  it('stamps a real flagship app without changing its routes or body', async () => {
    const flagship = join(import.meta.dirname, '../../../templates/apps/blog/app')
    const app = join(directory, 'blog')
    await mkdir(join(app, 'src'), { recursive: true })
    await copyFile(join(flagship, 'package.json'), join(app, 'package.json'))
    await copyFile(join(flagship, 'src/App.tsx'), join(app, 'src/App.tsx'))
    const before = await readFile(join(app, 'src/App.tsx'), 'utf8')
    await stampCapabilitySourceHeaders(app)
    const source = await readFile(join(app, 'src/App.tsx'), 'utf8')
    protectedRecipe(source)
    expect(source.endsWith(before)).toBe(true)
    await stampCapabilitySourceHeaders(app)
    expect(await readFile(join(app, 'src/App.tsx'), 'utf8')).toBe(source)
  })

  it('compiles the generated protected-view recipe against the installed hook', () => {
    const file = join(process.cwd(), 'url-selection-recipe.ts')
    const source = [
      `import { useListRoute, type ListRouteAuth } from '${binding}'`,
      "declare const routeAuthStatus: ListRouteAuth['status']",
      protectedRecipe(),
      'void list.canLoad; void list.selection',
    ].join('\n')
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    }
    const compiler = ts.createCompilerHost(options)
    const read = compiler.getSourceFile.bind(compiler)
    compiler.getSourceFile = (name, version, onError, fresh) =>
      name === file
        ? ts.createSourceFile(file, source, version, true)
        : read(name, version, onError, fresh)
    const errors = ts
      .getPreEmitDiagnostics(ts.createProgram([file], options, compiler))
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
    expect(errors).toEqual([])
  })

  it('redirects a signed-out URL selection without silently requesting the public view', async () => {
    const app = await mount('/orders?view=mine&page=3#items', 'unauthenticated')
    expect(app.url()).toBe('/login')
    expect(app.list()).toMatchObject({ selection: 'mine', canLoad: false })
    expect(app.fetch).not.toHaveBeenCalled()
    expect(app.state()).toEqual({ returnTo: '/orders?view=mine&page=3#items' })
    await app.back()
    expect(app.url()).toBe('/previous')
  })

  it('waits through restoration and unavailable auth without changing the requested view', async () => {
    const app = await mount('/orders?view=mine&page=3', 'loading')
    expect(app.list()).toMatchObject({ selection: 'mine', canLoad: false, status: 'loading' })
    expect(app.url()).toBe('/orders?view=mine&page=3')
    expect(app.fetch).not.toHaveBeenCalled()
    await app.setStatus('unavailable')
    expect(app.url()).toBe('/orders?view=mine&page=3')
    expect(app.fetch).not.toHaveBeenCalled()
    await app.setStatus('unauthenticated')
    expect(app.url()).toBe('/login')
    expect(app.fetch).not.toHaveBeenCalled()
  })

  it('loads the selected view when restoration authenticates the visitor', async () => {
    const app = await mount('/orders?view=mine&page=3', 'loading')
    await app.setStatus('authenticated')
    expect(app.url()).toBe('/orders?view=mine&page=3')
    expect(app.list()).toMatchObject({ selection: 'mine', page: 3, canLoad: true })
    expect(app.fetch).toHaveBeenCalledExactlyOnceWith('mine')
  })

  it.each(['authenticated', 'unauthenticated'] as const)(
    'keeps a public query-filtered view public for %s visitors',
    async (status) => {
      const app = await mount('/orders?status=open&page=2', status)
      expect(app.url()).toBe('/orders?status=open&page=2')
      expect(app.list()).toMatchObject({ selection: 'all', canLoad: true })
      expect(app.fetch).toHaveBeenCalledExactlyOnceWith('all')
      await app.selectMine()
      expect(app.url()).toBe(
        status === 'authenticated' ? '/orders?status=open&view=mine' : '/login',
      )
    },
  )

  it.each([
    '@molecule/app-routing-vue-router',
    '@molecule/app-routing-next',
    '@molecule/app-routing',
  ])('does not prescribe the React hook to a project declaring only %s', async (name) => {
    const app = join(directory, name.split('/')[1])
    await mkdir(join(app, 'src'), { recursive: true })
    await writeFile(
      join(app, 'package.json'),
      JSON.stringify({ dependencies: { [name]: '1.0.0' } }),
    )
    const body = 'export const App = () => null\n'
    await writeFile(join(app, 'src/App.tsx'), body)
    await stampCapabilitySourceHeaders(app)
    expect(await readFile(join(app, 'src/App.tsx'), 'utf8')).toBe(body)
  })
})
