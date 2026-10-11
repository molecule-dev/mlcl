// @vitest-environment jsdom
/**
 * `oauth-google-login`'s `SocialLoginButtons` must SURFACE a failed callback
 * exchange.
 *
 * `useOAuth` reports a failure — the code/state swap 4xxs, the account is
 * refused, the redirect lands without a usable code — through its OPTIONAL
 * `config.onError`. The slice passed none, so the hook cleaned `?code=…&state=…`
 * out of the URL and the reader landed back on the login page with nothing on
 * screen: indistinguishable from having cancelled, with no way to tell that a
 * retry (or a different account) is what the situation needs.
 *
 * The hook is stubbed at the package boundary (its own contract: it calls
 * `config.onError(error)`), and the REAL onError the component passes is driven
 * through it — so removing the wiring fails this test.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** The config the component handed `useOAuth` — captured, never replaced. */
const oauth = vi.hoisted(() => ({
  config: null as { onError?: (error: string) => void } | null,
}))

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
  useOAuth: (config: { onError?: (error: string) => void }) => {
    oauth.config = config
    return { providers: [], redirect: () => undefined }
  },
}))

vi.mock('@molecule/app-oauth-logos-react', () => ({
  OAuthProviderLogo: (props: { provider: string }) =>
    createElement('span', null, `logo:${props.provider}`),
}))

const { SocialLoginButtons } =
  (await import('../../../templates/.agents/skills/examples/auth/oauth-google-login/app/components/SocialLoginButtons.js')) as {
    SocialLoginButtons: () => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

beforeEach(() => {
  oauth.config = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  container.remove()
})

describe('oauth login buttons — a failed callback exchange is visible', () => {
  it('renders the message the hook reports through onError', async () => {
    await act(async () => {
      root.render(createElement(SocialLoginButtons))
    })

    // Nothing is shown before a failure.
    expect(container.querySelector('[data-mol-id="social-login-error"]')).toBeNull()

    // The hook hands the component a config and calls onError on a failed
    // exchange. Without the wiring this is `undefined` and the failure is
    // dropped on the floor.
    expect(typeof oauth.config?.onError).toBe('function')
    await act(async () => {
      oauth.config?.onError?.('OAuth login failed')
    })

    const alert = container.querySelector('[data-mol-id="social-login-error"]')
    expect(alert?.textContent).toContain('Could not sign in with Google')
    expect(alert?.getAttribute('role')).toBe('alert')
  })
})
