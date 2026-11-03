import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import * as jsxRuntime from 'react/jsx-runtime'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import type { AuthStatus } from '@molecule/app-auth'

/** Execute the shipped guard's branches with hook snapshots supplied by its caller. */
function guardResult(
  status: AuthStatus,
  isAuthenticated: boolean,
): { type: unknown; props: Record<string, unknown> } {
  const template = join(
    import.meta.dirname,
    '../../../templates/app/react-native-web/components/AuthGuard.tsx.tpl',
  )
  const source = readFileSync(template, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: 'AuthGuard.tsx',
  }).outputText
  const exports: { AuthGuard?: () => { type: unknown; props: Record<string, unknown> } } = {}
  const dependencies: Record<string, unknown> = {
    'react/jsx-runtime': jsxRuntime,
    'react-router': {
      Navigate: 'redirect',
      Outlet: 'outlet',
      useLocation: () => ({ pathname: '/settings' }),
    },
    '@molecule/app-react': {
      useAuth: () => ({ status, isAuthenticated }),
      useTranslation: () => ({ t: (key: string) => key }),
    },
  }
  runInNewContext(compiled, {
    exports,
    require: (name: string) => {
      if (!(name in dependencies)) throw new Error(`Unexpected guard dependency: ${name}`)
      return dependencies[name]
    },
  })
  expect(exports.AuthGuard).toBeTypeOf('function')
  return exports.AuthGuard!()
}

describe('React Native Web scaffold auth decision', () => {
  it('renders a cookie-only unavailable candidate without redirecting it to login', () => {
    expect(guardResult('unavailable', false).type).toBe('outlet')
  })

  it('redirects a decided signed-out visitor and preserves the attempted route', () => {
    const result = guardResult('unauthenticated', false)
    expect(result.type).toBe('redirect')
    expect(result.props.to).toBe('/login')
    expect(result.props.state).toEqual({ from: { pathname: '/settings' } })
  })

  it('waits while the initial session is undecided', () => {
    expect(guardResult('loading', false).type).toBe('div')
  })

  it('renders a restored signed-in visitor', () => {
    expect(guardResult('authenticated', true).type).toBe('outlet')
  })
})
