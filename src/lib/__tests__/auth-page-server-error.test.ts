// @vitest-environment jsdom
/**
 * A refused login or signup shows the API's own sentence, on every scaffolded auth page.
 *
 * The API answers a wrong password with `401 { error: 'Invalid email or password.' }`, and the HTTP
 * client's error carries that body under `response.data` while its own message is a status line
 * written for logs ("Request failed with status 401."). The scaffold's pages showed the status line
 * (harness smoke run, 2026-11-27): the React pages through the shared `Form`, the React Native Web
 * pages through their own `{error.message}`. This runs the shipped templates with the real
 * `HttpError`, the real `Form` and the real `serverErrorMessage`.
 *
 * @module
 */

import * as React from 'react'
import { act, createElement, type ReactNode } from 'react'
import * as jsx from 'react/jsx-runtime'
import { createRoot, type Root } from 'react-dom/client'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as http from '@molecule/app-http'
import { usePromise } from '@molecule/app-react'
import { getClassMap, setClassMap, type UIClassMap } from '@molecule/app-ui'
import { Form } from '@molecule/app-ui-react'

import { readAppTemplate } from './helpers/app-templates.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })
const roots: Root[] = []

beforeEach(() => {
  setClassMap(
    new Proxy(
      {},
      {
        get: (_target, name) =>
          ['cn', 'flex', 'h'].includes(String(name)) ? () => '' : String(name),
      },
    ) as UIClassMap,
  )
})
afterEach(() => {
  for (const root of roots.splice(0)) act(() => root.unmount())
})

const SENTENCE = 'Invalid email or password.'

/** The error the HTTP client throws for `401 { error: SENTENCE }`. */
function refused(): http.HttpError {
  return new http.HttpError(
    'Request failed with status 401.',
    401,
    {
      data: { error: SENTENCE },
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { method: 'POST', url: '/api/users/log-in' },
    },
    { method: 'POST', url: '/api/users/log-in' },
    'http.error.requestFailed',
  )
}

/**
 * Executes a shipped auth page with a submission that rejects.
 *
 * @param framework - The template framework directory.
 * @param name - The page.
 * @param submit - The login or signup call.
 * @returns The page component.
 */
function page(
  framework: 'react' | 'react-native-web',
  name: 'Login' | 'Signup',
  submit: () => Promise<unknown>,
): React.ComponentType {
  const compiled = ts.transpileModule(readAppTemplate(framework, `pages/${name}.tsx.tpl`), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const authHook = (): ReturnType<typeof usePromise<unknown, []>>[0] & {
    login: () => Promise<unknown>
    signup: () => Promise<unknown>
  } => {
    const [state, call] = usePromise(submit)
    return { ...state, login: call, signup: call }
  }
  const children = ({ children }: { children?: ReactNode }): React.ReactElement =>
    createElement('div', null, children)
  const button = ({
    children,
    type,
    disabled,
    onClick,
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.ReactElement =>
    createElement('button', { type, disabled, onClick }, children)
  const modules: Record<string, unknown> = {
    react: React,
    'react/jsx-runtime': jsx,
    'react-router': { useNavigate: () => vi.fn(), useLocation: () => ({ state: null }) },
    '@molecule/app-http': http,
    '@molecule/app-react': {
      useAuth: () => ({ isAuthenticated: false }),
      useLogin: authHook,
      useSignup: authHook,
      useTranslation: () => ({
        t: (key: string, _values?: unknown, options?: { defaultValue?: string }) =>
          options?.defaultValue ?? key,
      }),
    },
    '@molecule/app-ui': { getClassMap },
    '@molecule/app-ui-react': { Form, Flex: children, Button: button },
    '@molecule/app-ui-react-native': {
      Flex: children,
      Button: button,
      FormArea: ({ onSubmit, children }: { onSubmit?: () => unknown; children?: ReactNode }) =>
        createElement(
          'form',
          {
            onSubmit: (event: Event) => {
              event.preventDefault()
              void onSubmit?.()
            },
          },
          children,
        ),
    },
    '../branding.js': { APP_NAME: 'Example', LOGO_SIZE: 24 },
    '../components/FloatingInput.js': {
      FloatingInput: (props: React.InputHTMLAttributes<HTMLInputElement>) =>
        createElement('input', props),
    },
    '../components/OAuthButtons.js': { OAuthButtons: () => null },
    '../components/Footer.js': { Footer: () => null },
    '../components/ThemeToggle.js': { ThemeToggle: () => null },
    '../components/Icon.js': { Icon: () => null },
  }
  const exports: Record<string, React.ComponentType> = {}
  new Function('require', 'exports', compiled)((name: string) => {
    if (!(name in modules)) throw new Error(`Unexpected template dependency ${name}`)
    return modules[name]
  }, exports)
  return exports[name]
}

describe.each([
  ['react', 'Login'],
  ['react', 'Signup'],
  ['react-native-web', 'Login'],
  ['react-native-web', 'Signup'],
] as const)('%s %s', (framework, name) => {
  it("shows the server's sentence when the request is refused, not the status line", async () => {
    const submit = vi.fn(async () => {
      throw refused()
    })
    const host = document.createElement('div')
    const root = createRoot(host)
    roots.push(root)
    await act(async () => root.render(createElement(page(framework, name, submit))))
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(submit).toHaveBeenCalledOnce()
    expect(host.textContent).toContain(SENTENCE)
    expect(host.textContent).not.toContain('Request failed')
  })
})
