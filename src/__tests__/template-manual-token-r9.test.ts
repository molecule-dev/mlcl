// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React, { type ReactNode, StrictMode } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { BrowserRouter } from '@molecule/app-routing-react-router'

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, _values: unknown, options: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
  usePasswordReset: () => ({ confirmReset: vi.fn(), confirmStatus: 'idle' }),
  useLogin: () => ({ login: vi.fn(), status: 'idle' }),
  useAuth: () => ({ login: vi.fn() }),
}))
vi.mock('@molecule/app-auth-shell-react', () => ({
  useAuthFormState: () => ({ fields: {}, setField: vi.fn(), clear: vi.fn() }),
}))
vi.mock('@molecule/app-ui', () => ({ getClassMap: () => new Proxy({}, { get: () => () => '' }) }))
vi.mock('@molecule/app-legal-pages-react', () => ({ useLegalModals: () => ({}) }))
vi.mock('../../templates/apps/workout-tracker/app/src/components/ForjaAuthShell.js', () => ({
  ForjaAuthShell: ({ children }: { children: ReactNode }) =>
    React.createElement('div', null, children),
}))
vi.mock('../../templates/apps/workout-tracker/app/src/config.js', () => ({ loadContent: () => '' }))
vi.mock('../../templates/apps/auction-platform/app/src/components/AuthShell.js', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('../../templates/apps/rag-knowledge-base/app/src/components/AuthShell.js', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('../../templates/apps/ai-study-buddy/app/src/components/AuthShell.js', () => ({
  AuthShell: ({ children }: { children: ReactNode }) => React.createElement('div', null, children),
}))
vi.mock('../../templates/apps/ai-study-buddy/app/src/components/AuthBrandHeader.js', () => ({
  AuthBrandHeader: () => null,
}))

import { ResetPassword as Study } from '../../templates/apps/ai-study-buddy/app/src/pages/ResetPassword.js'
import { ResetPassword as Auction } from '../../templates/apps/auction-platform/app/src/pages/ResetPassword.js'
import { ResetPassword as Rag } from '../../templates/apps/rag-knowledge-base/app/src/pages/ResetPassword.js'
import { ResetPassword as Workout } from '../../templates/apps/workout-tracker/app/src/pages/ResetPassword.js'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

for (const [name, Page] of [
  ['workout-tracker', Workout],
  ['auction-platform', Auction],
  ['rag-knowledge-base', Rag],
  ['ai-study-buddy', Study],
] as const) {
  it(`${name} keeps manual reset-token entry available while typing`, () => {
    window.history.replaceState({}, '', '/reset-password?email=a%40example.test')
    render(
      React.createElement(
        StrictMode,
        null,
        React.createElement(BrowserRouter, null, React.createElement(Page)),
      ),
    )
    const input = screen.getByLabelText('Reset token') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'a' } })
    expect(screen.queryByLabelText('Reset token')).toBe(input)
    fireEvent.change(input, { target: { value: 'abc-token' } })
    expect(input.value).toBe('abc-token')
  })
}
