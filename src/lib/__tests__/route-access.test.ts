// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, render, screen } from '@testing-library/react'
import { createElement, type ReactNode, StrictMode, useEffect } from 'react'
import * as jsx from 'react/jsx-runtime'
import * as router from 'react-router'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { type AuthClient, createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import {
  AuthProvider,
  I18nProvider,
  useAuth,
  useAuthClient,
  useTranslation,
} from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'
import { AuthGuard, LoadErrorBanner } from '@molecule/app-ui-react'

interface PrivateView {
  path: string
  query?: Readonly<Record<string, string>>
}

type AppRoute = router.RouteObject & {
  access: 'public' | 'private'
  publicQuery?: Readonly<Record<string, string>>
  layout?: 'none'
  children?: AppRoute[]
}

interface AccessModule {
  RouteAccess: (props: {
    children: ReactNode
    views?: readonly PrivateView[]
    routes: AppRoute[]
  }) => ReactNode
  privateViews: readonly PrivateView[]
}

/** Resolve the scaffold's real shared dependencies and isolate external bonds. */
function scaffoldDependency(client?: AuthClient<UserProfile>): (name: string) => unknown {
  return (name: string) => {
    if (name === 'react/jsx-runtime') return jsx
    if (name === 'react-router') return router
    if (name === '@molecule/app-ui-react') return { AuthGuard, LoadErrorBanner }
    if (name === '@molecule/app-http') return { getClient: () => undefined }
    if (name === '@molecule/app-storage') return { getProvider: () => undefined }
    if (name === '../bonds/index.js' || name === './bonds/index.js') return { authClient: client }
    if (name === '@molecule/app-routing-react-router') {
      return {
        BrowserRouter: ({ children }: { children: ReactNode }) =>
          createElement(router.MemoryRouter, { initialEntries: ['/settings'] }, children),
      }
    }
    if (name === '@molecule/app-react') {
      return {
        useAuth,
        useAuthClient,
        useTranslation,
        MoleculeProvider: ({
          auth,
          children,
        }: {
          auth: AuthClient<UserProfile>
          children: ReactNode
        }) =>
          createElement(
            AuthProvider,
            { client: auth },
            createElement(I18nProvider, { provider: createSimpleI18nProvider('en') }, children),
          ),
      }
    }
    throw new Error(`Unexpected scaffold dependency: ${name}`)
  }
}

/** Execute the scaffold's shipped component, including its actual router matching. */
function accessModule(client?: AuthClient<UserProfile>): AccessModule {
  const source = readFileSync(
    join(import.meta.dirname, '../../../templates/app/react/components/AuthGuard.tsx.tpl'),
    'utf8',
  )
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports = {}
  new Function('require', 'exports', compiled.outputText)(scaffoldDependency(client), exports)
  return exports as AccessModule
}

const clients: AuthClient<UserProfile>[] = []

/** A real auth client, optionally with a stored bearer candidate awaiting restoration. */
function session(candidate = false): AuthClient<UserProfile> {
  const token = `${btoa('{}')}.${btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 }))}.signature`
  const client = createJWTAuthClient<UserProfile>({
    autoRefresh: false,
    storage: {
      getItem: (key) => (candidate && key.endsWith(':accessToken') ? token : null),
      setItem: () => undefined,
      removeItem: () => undefined,
    },
  })
  clients.push(client)
  return client
}

const views: readonly PrivateView[] = [
  { path: '/orders', query: { view: 'mine' } },
  { path: '/orders/:id/edit' },
]

/** The faulty source shape: a page silently chooses public data without a user. */
function List({ load }: { load: (selection: string) => void }): ReactNode {
  const { user } = useAuth()
  const { search } = router.useLocation()
  const selected = new URLSearchParams(search).get('view') === 'mine' && user ? 'mine' : 'all'
  useEffect(() => load(selected), [load, selected])
  return createElement('p', null, selected)
}

/** Mount the scaffold boundary before the page, using the real session and shared guard. */
async function mount(
  url: string,
  client = session(),
  policy = views,
  publicPolicy: readonly PrivateView[] = [
    { path: '/login' },
    { path: '/previous' },
    { path: '/orders' },
    { path: '/orders/:id' },
  ],
  configureRoutes: (routes: AppRoute[]) => AppRoute[] = (routes) => routes,
): Promise<{
  load: ReturnType<typeof vi.fn>
  location: () => router.Location
  navigate: (to: string | number) => Promise<void>
}> {
  const module = accessModule()
  expect(module.RouteAccess, 'the scaffold must ship an executable route boundary').toBeTypeOf(
    'function',
  )
  const load = vi.fn()
  const routes = configureRoutes([
    { path: '/login', access: 'public', element: createElement('p', null, 'Sign in') },
    ...publicPolicy
      .filter(({ path }) => path !== '/login')
      .map(({ path, query }) => ({
        path,
        access: 'public' as const,
        publicQuery: query,
        element: createElement(List, { load }),
      })),
    { path: '*', access: 'private', element: createElement(List, { load }) },
  ])
  function Pages(): ReactNode {
    return router.useRoutes(routes)
  }
  let location!: router.Location
  let navigate!: ReturnType<typeof router.useNavigate>
  function Location(): null {
    location = router.useLocation()
    navigate = router.useNavigate()
    return null
  }
  render(
    createElement(
      AuthProvider,
      { client, awaitSession: false },
      createElement(
        I18nProvider,
        { provider: createSimpleI18nProvider('en') },
        createElement(
          router.MemoryRouter,
          { initialEntries: ['/previous', url], initialIndex: 1 },
          createElement(Location),
          createElement(module.RouteAccess, {
            views: policy,
            routes,
            children: createElement(Pages),
          }),
        ),
      ),
    ),
  )
  await act(async () => {
    // Do not await restoration: tests must observe the pending-session window too.
    await Promise.resolve()
  })
  return {
    load,
    location: () => location,
    navigate: async (to: string | number) => {
      await act(async () => {
        if (typeof to === 'number') await navigate(to)
        else await navigate(to)
      })
    },
  }
}

beforeEach(() => {
  setIconSet({ 'x-circle': { paths: [] } })
  setClassMap(new Proxy({} as UIClassMap, { get: () => () => '' }))
})

afterEach(() => {
  cleanup()
  for (const client of clients.splice(0)) client.destroy()
  vi.unstubAllGlobals()
})

describe('scaffold route access before page selection', () => {
  it.each(['/register', '/invitations/team-blue'])(
    'renders a newly declared public page %s without a second path allowlist',
    async (url) => {
      const app = await mount(
        url,
        session(),
        [],
        [{ path: '/login' }, { path: '/register' }, { path: '/invitations/:code' }],
      )
      expect(app.location().pathname).toBe(url)
      expect(app.load).toHaveBeenCalledExactlyOnceWith('all')
    },
  )

  it('requires access on both page and nested route declarations at compile time', () => {
    const source = readFileSync(
      join(import.meta.dirname, '../../../templates/app/react/components/AuthGuard.tsx.tpl'),
      'utf8',
    )
    const parsed = ts.createSourceFile('AuthGuard.tsx', source, ts.ScriptTarget.Latest)
    const routeType = parsed.statements.find(
      (statement): statement is ts.TypeAliasDeclaration =>
        ts.isTypeAliasDeclaration(statement) && statement.name.text === 'AppRoute',
    )
    expect(routeType).toBeDefined()
    const file = join(import.meta.dirname, 'route-access-typecheck.tsx')
    const input = `import type { RouteObject } from 'react-router'
${routeType!.getText(parsed)}
const publicPage: AppRoute = { path: '/enroll', access: 'public' }
const privatePage: AppRoute = { path: '/staff', access: 'private' }
const nested: AppRoute = { access: 'private', children: [privatePage] }
const standalone: AppRoute = { path: '/terminal', access: 'private', layout: 'none' }
// @ts-expect-error Only an explicit opt-out is supported.
const invalidLayout: AppRoute = { path: '/terminal', access: 'public', layout: 'guessed' }
// @ts-expect-error Every page declares access.
const missing: AppRoute = { path: '/enroll' }
// @ts-expect-error Layout routes cannot hide a nested page's missing policy.
const missingNested: AppRoute = { access: 'public', children: [{ path: '/enroll' }] }
void [publicPage, privatePage, nested, standalone, invalidLayout, missing, missingNested]
`
    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      types: [],
    }
    const host = ts.createCompilerHost(options)
    const getSourceFile = host.getSourceFile.bind(host)
    host.getSourceFile = (name, ...args) =>
      name === file
        ? ts.createSourceFile(file, input, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
        : getSourceFile(name, ...args)
    const program = ts.createProgram([file], options, host)
    const diagnostics = ts.getPreEmitDiagnostics(program)
    expect(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
      ),
    ).toEqual([])
  })

  it('keeps a public child behind its private layout and honors native route ranking', async () => {
    const app = await mount(
      '/teams/blue/share',
      session(),
      [],
      [{ path: '/teams/*' }],
      (routes) => [
        ...routes,
        {
          path: '/teams/:team',
          access: 'private',
          element: createElement(router.Outlet),
          children: [{ path: 'share', access: 'public', element: routes.at(-1)!.element }],
        },
      ],
    )
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it('renders a nested public index route from the same route declaration', async () => {
    const app = await mount('/teams/blue', session(), [], [], (routes) => [
      ...routes,
      {
        path: '/teams/:team',
        access: 'public',
        element: createElement(router.Outlet),
        children: [{ index: true, access: 'public', element: routes.at(-1)!.element }],
      },
    ])
    expect(app.location().pathname).toBe('/teams/blue')
    expect(app.load).toHaveBeenCalledExactlyOnceWith('all')
  })

  it('keeps a declared private editor protected beside an explicitly public fallback', async () => {
    const app = await mount('/equipment/7/edit', session(), [], [], (routes) => [
      ...routes.filter((route) => route.path !== '*'),
      { path: '/equipment/:id/edit', access: 'private', element: routes.at(-1)!.element },
      { path: '*', access: 'public', element: routes.at(-1)!.element },
    ])
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it('keeps an explicitly shell-free private page protected', async () => {
    const app = await mount('/terminal', session(), [], [], (routes) => [
      ...routes,
      { path: '/terminal', access: 'private', layout: 'none', element: routes.at(-1)!.element },
    ])
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it('permits an intentionally public fallback without a blanket wildcard refusal', async () => {
    const app = await mount('/equipment/manual/new-page', session(), [], [], (routes) => [
      ...routes.filter((route) => route.path !== '*'),
      { path: '/equipment/:id/edit', access: 'private', element: routes.at(-1)!.element },
      { path: '*', access: 'public', element: routes.at(-1)!.element },
    ])
    expect(app.location().pathname).toBe('/equipment/manual/new-page')
    expect(app.load).toHaveBeenCalledExactlyOnceWith('all')
  })

  it.each(['/orders?view=mine&page=3#rows', '/orders/42/edit'])(
    'redirects a signed-out direct visit to %s before any page request',
    async (url) => {
      const app = await mount(url)
      expect(app.location().pathname).toBe('/login')
      expect(app.load).not.toHaveBeenCalled()
      expect(app.location().state.from).toMatchObject({
        pathname: url.split(/[?#]/)[0],
        search: url.includes('?') ? '?view=mine&page=3' : '',
        hash: url.includes('#') ? '#rows' : '',
      })
      await app.navigate(-1)
      expect(app.location().pathname).toBe('/previous')
    },
  )

  it.each(['/orders?view=all&page=3', '/orders?status=open', '/orders/42'])(
    'keeps the public view %s public',
    async (url) => {
      const app = await mount(url)
      expect(app.location().pathname + app.location().search).toBe(url)
      expect(app.load).toHaveBeenCalledExactlyOnceWith('all')
    },
  )

  it('applies the same boundary on navigation and browser history', async () => {
    const app = await mount('/orders?view=all')
    app.load.mockClear()
    await app.navigate('/orders?view=mine')
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
    await app.navigate(-1)
    expect(app.location().search).toBe('?view=all')
    await app.navigate(1)
    expect(app.location().pathname).toBe('/login')
  })

  it('holds a private view through restoration and then renders the requested view', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((done) => (resolve = done))),
    )
    const client = session(true)
    const app = await mount('/orders?view=mine', client)
    expect(client.getState().status).toBe('loading')
    expect(app.location().search).toBe('?view=mine')
    expect(app.load).not.toHaveBeenCalled()
    await act(async () => {
      resolve(new Response(JSON.stringify({ user: { id: 'reader' } }), { status: 200 }))
      await client.whenRestored!()
    })
    expect(app.load).toHaveBeenCalledExactlyOnceWith('mine')
  })

  it('does not classify an unavailable session as signed out', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(new Response('', { status: 503 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ user: { id: 'reader' } }), { status: 200 }),
        ),
    )
    const client = session(true)
    const app = await mount('/orders?view=mine', client)
    await act(async () => client.whenRestored!())
    expect(client.getState().status).toBe('unavailable')
    expect(app.location().pathname).toBe('/orders')
    expect(screen.queryByText('Sign in')).toBeNull()
    expect(app.load).not.toHaveBeenCalled()
    await act(async () => {
      screen.getByRole('button', { name: /retry/i }).click()
    })
    expect(client.getState().status).toBe('authenticated')
    expect(app.load).toHaveBeenCalledExactlyOnceWith('mine')
  })

  it('redirects only after restoration confirms sign-out', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((done) => (resolve = done))),
    )
    const client = session(true)
    const app = await mount('/orders?view=mine', client)
    expect(app.location().pathname).toBe('/orders')
    expect(app.load).not.toHaveBeenCalled()
    await act(async () => {
      resolve(new Response('', { status: 401 }))
      await client.whenRestored!()
    })
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it('leaves a public view available while restoration is pending', async () => {
    let resolve!: (response: Response) => void
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>((done) => (resolve = done))),
    )
    const client = session(true)
    const app = await mount('/orders?view=all', client)
    expect(app.location().search).toBe('?view=all')
    expect(app.load).toHaveBeenCalledExactlyOnceWith('all')
    await act(async () => {
      resolve(new Response('', { status: 401 }))
      await client.whenRestored!()
    })
  })

  it('guards the generated private routes without page-owned auth checks', async () => {
    const module = accessModule()
    const app = await mount('/settings', session(), module.privateViews)
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it('keeps a flagship public path public and protects its query-selected private view', async () => {
    // Blog's post reader is public; the writer's comments page is private.
    const appSource = readFileSync(
      join(import.meta.dirname, '../../../templates/apps/blog/app/src/App.tsx'),
      'utf8',
    )
    expect(appSource).toContain('path="/post/:id"')
    expect(appSource).toContain('path="/comments"')
    const policy = [{ path: '/comments' }, { path: '/post/:id', query: { panel: 'moderation' } }]
    const app = await mount('/post/intro?panel=read', session(), policy, [
      { path: '/login' },
      { path: '/post/:id' },
    ])
    expect(app.location().pathname).toBe('/post/intro')
    expect(app.load).toHaveBeenCalledExactlyOnceWith('all')
    app.load.mockClear()
    await app.navigate('/post/intro?panel=moderation')
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it.each(['/draft/new', '/orders/42/revise', '/reports/private?format=csv'])(
    'protects an undeclared new route %s without a page-owned guard',
    async (url) => {
      const app = await mount(url, session(), [])
      expect(app.location().pathname).toBe('/login')
      expect(app.load).not.toHaveBeenCalled()
    },
  )

  it('permits a public query view without making its other selections public', async () => {
    const app = await mount(
      '/catalog?mode=read',
      session(),
      [],
      [{ path: '/login' }, { path: '/catalog', query: { mode: 'read' } }],
    )
    expect(app.location().search).toBe('?mode=read')
    expect(app.load).toHaveBeenCalledOnce()
    app.load.mockClear()
    await app.navigate('/catalog?mode=write')
    expect(app.location().pathname).toBe('/login')
    expect(app.load).not.toHaveBeenCalled()
  })

  it('lets an authenticated visitor use an undeclared new route', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ user: { id: 'writer' } }), { status: 200 })),
    )
    const client = session(true)
    const app = await mount('/draft/new', client, [])
    await act(async () => client.whenRestored!())
    expect(app.location().pathname).toBe('/draft/new')
    expect(app.load).toHaveBeenCalledOnce()
  })

  it.each([false, true])(
    'mounts the entry-point boundary before unguarded pages when AppRoot is replaced: %s',
    async (replaceWrapper) => {
      const client = session()
      const mounted = vi.fn()
      function Page(): ReactNode {
        useEffect(() => mounted(), [])
        return createElement('p', null, 'Page mounted')
      }
      let source = readFileSync(
        join(import.meta.dirname, '../../../templates/app/react/App.tsx.tpl'),
        'utf8',
      )
      // The retained failure replaced AppRoot's provider composition while editing
      // page routes. Its export survived; the policy wrapper inside it did not.
      if (replaceWrapper)
        source = source.replace(
          '<RouteAccess routes={routes}>{children}</RouteAccess>',
          '{children}',
        )
      const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
      })
      const exports: {
        App?: () => ReactNode
        AppRoot?: (props: { children: ReactNode }) => ReactNode
      } = {}
      new Function('require', 'exports', compiled.outputText)((name: string) => {
        if (name === 'react/jsx-runtime') return jsx
        if (name === 'react-router') return router
        if (name === './components/AppLayout.js') return { AppLayout: router.Outlet }
        if (name === './components/AuthGuard.js') return accessModule(client)
        if (name === './bonds/index.js' || name.startsWith('@molecule/'))
          return scaffoldDependency(client)(name)
        const page = /^\.\/pages\/(\w+)\.js$/.exec(name)?.[1]
        if (page)
          return { [page]: page === 'Login' ? () => createElement('p', null, 'Sign in') : Page }
        throw new Error(`Unexpected App dependency: ${name}`)
      }, exports)
      const entry = ts.transpileModule(
        readFileSync(
          join(import.meta.dirname, '../../../templates/app/react/main.tsx.tpl'),
          'utf8',
        ),
        { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } },
      )
      new Function('require', 'exports', entry.outputText)((name: string) => {
        if (name === 'react/jsx-runtime') return jsx
        if (name === 'react') return { StrictMode }
        if (name === 'react-dom/client') {
          return {
            createRoot: () => ({ render: (node: Parameters<typeof render>[0]) => render(node) }),
          }
        }
        if (name === './bonds/index.js')
          return { authClient: client, setupProviders: () => undefined }
        if (name === './App.js') return exports
        if (name === './components/AppLayout.js')
          return { AppLayout: ({ children }: { children: ReactNode }) => children }
        if (name === './components/AuthGuard.js') return accessModule(client)
        if (name === './pwa.js') return { registerPWA: () => undefined }
        if (name.endsWith('.css')) return {}
        throw new Error(`Unexpected entry dependency: ${name}`)
      }, {})
      await act(async () => client.whenRestored!())
      expect(screen.queryByText('Sign in')).not.toBeNull()
      expect(mounted).not.toHaveBeenCalled()
    },
  )
})
