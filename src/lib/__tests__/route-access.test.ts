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

interface AccessModule {
  RouteAccess: (props: {
    children: ReactNode
    views?: readonly PrivateView[]
    publicViews?: readonly PrivateView[]
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
            publicViews: publicPolicy,
            children: createElement(
              router.Routes,
              null,
              createElement(router.Route, {
                path: '/login',
                element: createElement('p', null, 'Sign in'),
              }),
              createElement(router.Route, {
                path: '*',
                element: createElement(List, { load }),
              }),
            ),
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

  it('mounts the entry-point boundary before App routes that have no page-owned guard', async () => {
    const client = session()
    const mounted = vi.fn()
    function Page(): ReactNode {
      useEffect(() => mounted(), [])
      return createElement('p', null, 'Page mounted')
    }
    const source = readFileSync(
      join(import.meta.dirname, '../../../templates/app/react/App.tsx.tpl'),
      'utf8',
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
      readFileSync(join(import.meta.dirname, '../../../templates/app/react/main.tsx.tpl'), 'utf8'),
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
      if (name === './components/AuthGuard.js') return accessModule(client)
      if (name === './pwa.js') return { registerPWA: () => undefined }
      if (name.endsWith('.css')) return {}
      throw new Error(`Unexpected entry dependency: ${name}`)
    }, {})
    await act(async () => client.whenRestored!())
    expect(screen.queryByText('Sign in')).not.toBeNull()
    expect(mounted).not.toHaveBeenCalled()
  })
})
