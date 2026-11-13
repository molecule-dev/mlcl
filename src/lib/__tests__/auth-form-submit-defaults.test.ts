// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import * as React from 'react'
import { act, createElement, type ReactNode } from 'react'
import * as jsx from 'react/jsx-runtime'
import { createRoot, type Root } from 'react-dom/client'
import ts from 'typescript'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePromise, type UsePromiseState } from '@molecule/app-react'
import { getClassMap, setClassMap, type UIClassMap } from '@molecule/app-ui'
import { Form } from '@molecule/app-ui-react'

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

/** Execute the shipped template with its real submission hook and shared Form. */
function page(
  name: 'Login' | 'Signup',
  submit: () => Promise<unknown>,
  navigate: ReturnType<typeof vi.fn>,
): React.ComponentType {
  const source = readFileSync(
    join(import.meta.dirname, `../../../templates/app/react/pages/${name}.tsx.tpl`),
    'utf8',
  )
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText
  const authHook = (): UsePromiseState<unknown> & {
    login: () => Promise<unknown>
    signup: () => Promise<unknown>
  } => {
    const [state, call] = usePromise(submit)
    return { ...state, login: call, signup: call }
  }
  const children = ({ children }: { children?: ReactNode }): React.ReactElement =>
    createElement('div', null, children)
  const modules: Record<string, unknown> = {
    react: React,
    'react/jsx-runtime': jsx,
    'react-router': { useNavigate: () => navigate, useLocation: () => ({ state: null }) },
    '@molecule/app-react': {
      useAuth: () => ({ isAuthenticated: false }),
      useLogin: authHook,
      useSignup: authHook,
      useTranslation: () => ({ t: (key: string) => key }),
    },
    '@molecule/app-ui': { getClassMap },
    '@molecule/app-ui-react': {
      Form,
      Flex: children,
      Button: ({
        children,
        type,
        disabled,
        onClick,
      }: React.ButtonHTMLAttributes<HTMLButtonElement>) =>
        createElement('button', { type, disabled, onClick }, children),
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

describe.each(['Login', 'Signup'] as const)('%s scaffold submit errors', (name) => {
  it('renders every server field error with the shipped shared Form and leaves the form usable', async () => {
    const failure = Object.assign(new Error('Request failed'), {
      status: 400,
      body: { errors: { email: ['is already taken'], displayName: ['is too short'] } },
    })
    const submit = vi.fn(async () => {
      throw failure
    })
    const navigate = vi.fn()
    const Page = page(name, submit, navigate)
    const host = document.createElement('div')
    const root = createRoot(host)
    roots.push(root)
    await act(async () => root.render(createElement(Page)))
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(host.querySelector('[role="alert"]')?.textContent).toContain('email is already taken')
    expect([...host.querySelectorAll('li')].map((node) => node.textContent)).toEqual([
      'email is already taken',
      'displayName is too short',
    ])
    expect(host.querySelector('fieldset')?.disabled).toBe(false)
    expect(submit).toHaveBeenCalledOnce()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('navigates normally after a successful submission without error UI', async () => {
    const navigate = vi.fn()
    const Page = page(name, async () => ({ user: { email: 'reader@example.test' } }), navigate)
    const host = document.createElement('div')
    const root = createRoot(host)
    roots.push(root)
    await act(async () => root.render(createElement(Page)))
    await act(async () => {
      host
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })
})
