// @vitest-environment jsdom
/**
 * Every OAuth button the `oauth-google-login` slice renders must have a bond
 * behind it.
 *
 * A button calls `redirect(provider)`, which navigates the browser to the
 * framework's initiation route `GET /users/oauth/:provider`. That route
 * resolves the provider through `get('oauth', name)` and answers
 * `user.error.oauthServerNotConfigured` when nothing is bonded under that name —
 * so a button for an unwired provider sends the reader to an error instead of a
 * consent screen. The slice shipped exactly that: two buttons (Google and
 * GitHub) while `api/bonds/` carried only `oauth-google.ts`, and the README's
 * "How to adapt" wires only Google, so a project copied from it had a live dead
 * affordance on its login page.
 *
 * Both sides of the assertion are DERIVED — the providers the slice actually
 * bonds (its own `api/bonds/oauth-*.ts` files) and the buttons the component
 * actually renders — never a hand-typed list that could drift with either side.
 *
 * @module
 */

import { readdirSync } from 'node:fs'
import { join } from 'node:path'

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SLICE_DIR = join(
  import.meta.dirname,
  '..',
  '..',
  '..',
  'templates',
  '.agents',
  'skills',
  'examples',
  'auth',
  'oauth-google-login',
)

/** The providers the slice ships a bond for — `oauth-<provider>.ts`. */
function bondedProviders(): string[] {
  return readdirSync(join(SLICE_DIR, 'api', 'bonds'))
    .filter((file) => file.startsWith('oauth-') && file.endsWith('.ts'))
    .map((file) => file.slice('oauth-'.length, -'.ts'.length))
    .sort()
}

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
  useOAuth: () => ({ providers: [], redirect: () => undefined }),
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

describe('oauth login buttons — a button always has a bond behind it', () => {
  it('renders one button per bonded provider, and none for an unwired one', async () => {
    await act(async () => {
      root.render(createElement(SocialLoginButtons))
    })

    const rendered = Array.from(container.querySelectorAll('[data-mol-id^="oauth-"]'))
      .map((el) => (el.getAttribute('data-mol-id') ?? '').slice('oauth-'.length))
      .sort()

    // Non-vacuousness: the slice does bond at least one provider, so an empty
    // component would fail here rather than pass by having nothing to check.
    expect(bondedProviders().length).toBeGreaterThan(0)
    expect(rendered).toEqual(bondedProviders())
  })
})
