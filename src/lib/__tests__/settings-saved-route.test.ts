// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as react from 'react'
import * as jsx from 'react/jsx-runtime'
import * as router from 'react-router'
import ts from 'typescript'
import { afterEach, expect, it, vi } from 'vitest'

import { createJWTAuthClient, type UserProfile } from '@molecule/app-auth'
import * as hooks from '@molecule/app-react'

const t = (_key: string, _values: unknown, options: { defaultValue: string }): string =>
  options.defaultValue
const cm = new Proxy(
  {},
  { get: (_target, key) => (key === 'cn' ? (...values: string[]) => values.join(' ') : () => '') },
)
const clients: Array<{ destroy: () => void }> = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((c) => c.destroy())
  vi.unstubAllGlobals()
})
function Settings(): react.ComponentType<{
  onSaved?: (user: UserProfile & { username?: string }) => void
}> {
  const source = readFileSync(
    join(import.meta.dirname, '../../../templates/app/react/pages/Settings.tsx.tpl'),
    'utf8',
  )
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports: {
    Settings?: react.ComponentType<{
      onSaved?: (user: UserProfile & { username?: string }) => void
    }>
  } = {}
  new Function('require', 'exports', result.outputText)((id: string) => {
    if (id === 'react') return react
    if (id === 'react/jsx-runtime') return jsx
    if (id === '@molecule/app-react') return { ...hooks, useTranslation: () => ({ t }) }
    if (id === '@molecule/app-ui') return { getClassMap: () => cm }
    throw Error('Unexpected import ' + id)
  }, exports)
  return exports.Settings!
}

it.each([true, false])(
  'the scaffold publishes the saved user and respects its app navigation option (%s)',
  async (redirect) => {
    const items = new Map<string, string>()
    let server = { id: 'staff-1', name: 'Before', username: 'before', bio: 'Bio', avatar: '' }
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        server = { ...server, name: 'Saved', username: 'server/name' }
        return Response.json({ user: server })
      }),
    )
    const client = createJWTAuthClient<typeof server>({
      autoRefresh: false,
      profileEndpoint: '/employees/current',
      profileUpdateMethod: 'PUT',
      mapAuthResponse: (data) => ({ user: (data as { user: typeof server }).user }),
      storage: {
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => {
          items.set(key, value)
        },
        removeItem: (key) => {
          items.delete(key)
        },
      },
    })
    clients.push(client)
    client.setSession({ accessToken: 'test-token', user: server })
    const Page = Settings()
    function Header(): react.ReactNode {
      return react.createElement('nav', {}, hooks.useAuth<typeof server>().user?.username)
    }
    function Form(): react.ReactNode {
      const navigate = router.useNavigate()
      return react.createElement(Page, {
        onSaved: redirect
          ? (saved) => navigate('/people/' + encodeURIComponent(saved.username!))
          : undefined,
      })
    }
    function Place(): react.ReactNode {
      return react.createElement('output', {}, router.useLocation().pathname)
    }
    render(
      react.createElement(
        hooks.AuthProvider,
        { client },
        react.createElement(
          router.MemoryRouter,
          { initialEntries: ['/settings'] },
          react.createElement(Header),
          react.createElement(Place),
          react.createElement(
            router.Routes,
            {},
            react.createElement(router.Route, {
              path: '/settings',
              element: react.createElement(Form),
            }),
            react.createElement(router.Route, {
              path: '/people/:id',
              element: react.createElement('p', {}, 'Saved account'),
            }),
          ),
        ),
      ),
    )
    await act(async () =>
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Requested name' } }),
    )
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Save changes' })))
    await waitFor(() =>
      expect(screen.getByText(redirect ? '/people/server%2Fname' : '/settings')).toBeTruthy(),
    )
    expect(screen.getByRole('navigation').textContent).toBe('server/name')
    expect(client.getUser()?.username).toBe('server/name')
  },
)
