// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { createElement, type ReactNode } from 'react'
import * as jsx from 'react/jsx-runtime'
import * as router from 'react-router'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import * as authShell from '@molecule/app-auth-shell-react'
import { AppShellLayout } from '@molecule/app-shell-layout-react'
import { getClassMap, setClassMap } from '@molecule/app-ui'
import { Button, Flex, Form } from '@molecule/app-ui-react'
import { classMap } from '@molecule/app-ui-tailwind'

const templates = join(import.meta.dirname, '../../../templates')
type PageRoute = router.RouteObject & { access?: 'public' | 'private'; layout?: 'none' }

/** Execute the authored template; only external services and page contents are substituted. */
function evaluate(file: string, dependency: (name: string) => unknown): Record<string, unknown> {
  const source = readFileSync(join(templates, file), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports = {}
  new Function('require', 'exports', compiled.outputText)(dependency, exports)
  return exports
}

/** Mount the actual generated entry, provider wrapper, route declaration and shell. */
function mount(url: string, configure?: (routes: PageRoute[]) => void, realPages = false): void {
  const passThrough = ({ children }: { children: ReactNode }): ReactNode => children
  const baseDependency = (name: string): unknown => {
    if (name === 'react') return React
    if (name === 'react/jsx-runtime') return jsx
    if (name === 'react-router') return router
    if (name === '@molecule/app-shell-layout-react') return { AppShellLayout }
    if (name === '@molecule/app-react')
      return {
        MoleculeProvider: passThrough,
        useAuth: () => ({ isAuthenticated: false }),
        useTranslation: () => ({ t: (key: string) => key }),
        useLogin: () => ({ status: 'idle' }),
        useSignup: () => ({ status: 'idle' }),
        usePasswordReset: () => ({ requestStatus: 'idle', confirmStatus: 'idle' }),
      }
    if (name === '@molecule/app-ui') return { getClassMap }
    if (name === '@molecule/app-ui-react') return { Button, Flex, Form }
    if (name === '../components/FloatingInput.js')
      return {
        FloatingInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
          createElement('input', props),
      }
    if (name === '../components/OAuthButtons.js') return { OAuthButtons: () => null }
    if (name === '../components/Icon.js') return { Icon: () => createElement('svg') }
    if (name === '../components/Footer.js')
      return { Footer: () => createElement('footer', null, 'Footer') }
    if (name === '../components/ThemeToggle.js') return { ThemeToggle: () => null }
    if (name === '../branding.js') return { APP_NAME: 'Example', LOGO_SIZE: 24 }
    if (name === '@molecule/app-http') return { getClient: () => undefined }
    if (name === '@molecule/app-storage') return { getProvider: () => undefined }
    if (name === '@molecule/app-routing-react-router')
      return {
        BrowserRouter: ({ children }: { children: ReactNode }) =>
          createElement(router.MemoryRouter, { initialEntries: [url] }, children),
      }
    if (name === './components/AuthGuard.js') return { RouteAccess: passThrough }
    if (name === './bonds/index.js')
      return { setupProviders: () => undefined, authClient: { initialize: async () => undefined } }
    if (name === './Header.js')
      return {
        Header: () =>
          createElement('header', null, createElement(router.Link, { to: '/' }, 'Home')),
      }
    if (name === './Footer.js') return { Footer: () => createElement('footer', null, 'Footer') }
    if (name === './pwa.js') return { registerPWA: () => undefined }
    if (name.endsWith('.css')) return {}
    if (name === 'react-dom/client')
      return { createRoot: () => ({ render: (node: ReactNode) => render(node) }) }
    const page = /^\.\/pages\/(\w+)\.js$/.exec(name)?.[1]
    if (page) {
      if (realPages && ['Login', 'Signup', 'ForgotPassword', 'ResetPassword'].includes(page))
        return evaluate('app/react/pages/' + page + '.tsx.tpl', baseDependency)
      return { [page]: () => createElement('h1', null, page) }
    }
    throw new Error(`Unexpected template dependency: ${name}`)
  }
  const layout = evaluate('app/react/components/AppLayout.tsx.tpl', baseDependency)
  const dependency = (name: string): unknown => {
    if (name === './components/AppLayout.js') return layout
    if (name === './App.js') return app
    return baseDependency(name)
  }
  const app = evaluate('app/react/App.tsx.tpl', dependency)
  configure?.(app.routes as PageRoute[])
  evaluate('app/react/main.tsx.tpl', dependency)
}

beforeEach(() => {
  setClassMap(classMap)
})
afterEach(cleanup)

describe('scaffold shell defaults independently of route access', () => {
  it.each(['/login', '/signup', '/forgot-password', '/reset-password', '/about', '/settings'])(
    'keeps shared navigation and one shell on %s',
    (url) => {
      mount(url)
      expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
      expect(screen.queryAllByRole('banner')).toHaveLength(1)
      expect(screen.queryAllByRole('main')).toHaveLength(1)
      expect(screen.queryAllByRole('contentinfo')).toHaveLength(1)
      expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
    },
  )

  it('wraps new public pages beside a private layout group (the retained faulty route shape)', async () => {
    mount('/enroll', (routes) => {
      routes.push({
        path: '/enroll',
        access: 'public',
        element: createElement('h1', null, 'Enroll'),
      })
    })
    expect(screen.getByRole('heading', { name: 'Enroll' })).toBeTruthy()
    const home = screen.queryByRole('link', { name: 'Home' })
    expect(home).not.toBeNull()
    await act(async () => fireEvent.click(home!))
    expect(screen.getByRole('heading', { name: 'Home' })).toBeTruthy()
  })

  it.each(['/login', '/signup', '/forgot-password', '/reset-password'])(
    'renders the shipped auth form on %s without duplicate page chrome',
    (url) => {
      mount(url, undefined, true)
      expect(screen.queryAllByRole('banner')).toHaveLength(1)
      expect(screen.queryAllByRole('main')).toHaveLength(1)
      expect(screen.queryAllByRole('contentinfo')).toHaveLength(1)
      expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(document.querySelector('input')).not.toBeNull()
    },
  )

  it('allows a deliberate full-screen page through an explicit route opt-out', () => {
    mount('/kiosk', (routes) => {
      routes.push({
        path: '/kiosk',
        access: 'public',
        layout: 'none',
        element: createElement('h1', null, 'Full-screen sign in'),
      })
    })
    expect(screen.getByRole('heading', { name: 'Full-screen sign in' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
    expect(screen.queryByRole('contentinfo')).toBeNull()
  })

  it('applies an explicit opt-out to a nested branch and restores the shell after navigation', async () => {
    mount('/terminal/unlock', (routes) => {
      routes.push({
        path: '/terminal',
        access: 'public',
        layout: 'none',
        children: [
          {
            path: 'unlock',
            element: createElement(
              'div',
              null,
              createElement('h1', null, 'Unlock terminal'),
              createElement(router.Link, { to: '/about' }, 'Exit terminal'),
            ),
          },
        ],
      })
    })
    expect(screen.getByRole('heading', { name: 'Unlock terminal' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
    await act(async () => fireEvent.click(screen.getByRole('link', { name: 'Exit terminal' })))
    expect(screen.getByRole('heading', { name: 'About' })).toBeTruthy()
    expect(screen.queryAllByRole('banner')).toHaveLength(1)
  })

  it('leaves a flagship auth route outside its private bookshelf layout', async () => {
    const passThrough = ({ children }: { children: ReactNode }): ReactNode => children
    const exports = evaluate('apps/book-tracker/app/src/App.tsx', (name) => {
      if (name === 'react') return { Suspense: passThrough }
      if (name === 'react/jsx-runtime') return jsx
      if (name === 'react-router') return router
      if (name === '@molecule/app-routing-react-router')
        return {
          BrowserRouter: ({ children }: { children: ReactNode }) =>
            createElement(router.MemoryRouter, { initialEntries: ['/login'] }, children),
          lazyPage: () => () => createElement('h1', null, 'Flagship page'),
        }
      if (name === '@molecule/app-react') return { MoleculeProvider: passThrough }
      if (name === '@molecule/app-http') return { getClient: () => undefined }
      if (name === '@molecule/app-storage') return { getProvider: () => undefined }
      if (name === '@molecule/app-root-error-boundary-react')
        return { RootErrorBoundary: passThrough }
      if (name === '@molecule/app-analytics-react') return { AnalyticsRouteListener: () => null }
      if (name === './bonds/index.js') return {}
      if (name === './components/RootErrorBoundary.js') return { RootErrorBoundary: passThrough }
      if (name === './components/AuthGuard.js') return { AuthGuard: router.Outlet }
      if (name === './components/BookshelfLayout.js') return { BookshelfLayout: router.Outlet }
      throw new Error(`Unexpected flagship dependency: ${name}`)
    })
    render(createElement(exports.App as () => ReactNode))
    expect(screen.getByRole('heading', { name: 'Flagship page' })).toBeTruthy()
    expect(screen.queryByRole('banner')).toBeNull()
  })

  it('preserves the non-X1 flagship auth surface with its own home link and main region', () => {
    const module = evaluate('apps/book-tracker/app/src/components/AuthShell.tsx', (name) => {
      if (name === 'react/jsx-runtime') return jsx
      if (name === 'react-router') return router
      if (name === '@molecule/app-auth-shell-react') return authShell
      if (name === '@molecule/app-react')
        return {
          useTranslation: () => ({
            t: (key: string, _: unknown, options?: { defaultValue: string }) =>
              options?.defaultValue ?? key,
          }),
        }
      if (name === '@molecule/app-ui') return { getClassMap }
      if (name === '../branding.js') return { APP_NAME: 'Library', APP_TAGLINE: 'Read' }
      if (name === './BrandWordmark.js')
        return { BrandWordmark: () => createElement('span', null, 'Library') }
      if (name === './ThemeToggle.js') return { ThemeToggle: () => null }
      throw new Error('Unexpected flagship auth dependency: ' + name)
    })
    render(
      createElement(
        router.MemoryRouter,
        null,
        createElement(module.AuthShell as React.ComponentType<Record<string, unknown>>, {
          eyebrow: 'Library',
          heading: 'Sign in',
          children: createElement('input', { name: 'email' }),
        }),
      ),
    )
    expect(screen.queryAllByRole('banner')).toHaveLength(1)
    expect(screen.queryAllByRole('main')).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Library' })?.getAttribute('href')).toBe('/')
    expect(document.querySelector('input[name="email"]')).not.toBeNull()
  })
})
