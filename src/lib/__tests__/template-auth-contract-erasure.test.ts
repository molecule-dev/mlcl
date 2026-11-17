// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({
  changePassword: vi.fn(async () => undefined),
  redirect: vi.fn(),
  login: vi.fn(async () => ({ user: { id: 'operator' } })),
  navigate: vi.fn(),
}))
const classMap = vi.hoisted(() => {
  const stub: unknown = new Proxy(function classMapStub() {}, {
    get: (_target, prop) => (prop === Symbol.toPrimitive ? () => 'stub' : stub),
    apply: () => 'stub',
  })
  return stub
})
vi.mock('@molecule/app-ui', () => ({ getClassMap: () => classMap }))
vi.mock('@molecule/app-react', () => ({
  useAuth: () => ({ user: { id: 'operator' }, login: calls.login }),
  useAuthClient: () => ({ changePassword: calls.changePassword }),
  useOAuth: () => ({ redirect: calls.redirect }),
  useHttpClient: () => ({ get: async () => ({ data: { twoFactorEnabled: false } }) }),
  useTranslation: () => ({
    t: (key: string, _values: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}))
vi.mock('@molecule/app-oauth-logos-react', () => ({ OAuthProviderLogo: () => null }))
vi.mock('@molecule/app-auth-shell-react', () => ({
  useAuthFormState: () => ({
    fields: { email: 'operator@example.test' },
    setField: vi.fn(),
    clear: vi.fn(),
  }),
}))
vi.mock('react-router', () => ({ useNavigate: () => calls.navigate, Link: () => null }))
vi.mock('../../../templates/apps/ai-meeting-notes/app/src/components/AuthShell.js', () => ({
  AuthShell: ({ children }: { children: unknown }) => children,
}))

import { Login } from '../../../templates/apps/ai-meeting-notes/app/src/pages/Login.js'
import SecurityAccessSection from '../../../templates/apps/personal-finance/app/src/components/SecurityAccessSection.js'
import LoginSocialAuth from '../../../templates/apps/property-listing/app/src/components/LoginSocialAuth.js'

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('template actions use the declared authentication contracts', () => {
  it('changes the password through the auth client that owns that operation', async () => {
    const view = render(createElement(SecurityAccessSection))
    fireEvent.click(
      view.container.querySelector('[data-mol-id="security-change-password-toggle"]')!,
    )
    fireEvent.change(view.getByPlaceholderText('Current password'), {
      target: { value: 'current-password' },
    })
    fireEvent.change(view.getByPlaceholderText('New password (min. 8 chars)'), {
      target: { value: 'replacement-password' },
    })
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() =>
      expect(calls.changePassword).toHaveBeenCalledExactlyOnceWith(
        'current-password',
        'replacement-password',
      ),
    )
  })

  it('uses the OAuth hook for both configured providers', async () => {
    const view = render(createElement(LoginSocialAuth))
    fireEvent.click(view.getByRole('button', { name: 'Google' }))
    await waitFor(() => expect(calls.redirect).toHaveBeenCalledWith('google'))
    fireEvent.click(view.getByRole('button', { name: 'GitHub' }))
    await waitFor(() => expect(calls.redirect).toHaveBeenCalledWith('github'))
  })

  it('preserves the existing typed login and navigation flow', async () => {
    const view = render(createElement(Login))
    fireEvent.change(view.container.querySelector('input[type="password"]')!, {
      target: { value: 'operator-password' },
    })
    fireEvent.submit(view.container.querySelector('form')!)
    await waitFor(() =>
      expect(calls.login).toHaveBeenCalledExactlyOnceWith({
        email: 'operator@example.test',
        password: 'operator-password',
      }),
    )
    expect(calls.navigate).toHaveBeenCalledWith('/dashboard')
  })
})
