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

/**
 * The `useOAuth()` double: the redirect it was clicked into, and the provider
 * list the component configured it with.
 *
 * Both are RECORDED, not thrown away. Asserting only on `data-mol-id` left the
 * dead affordance reachable through the two other lists the component carries:
 * a button whose `onClick` called `redirect('github')` (or a hook configured
 * with `oauthProviders: ['github']`) while its id still read `oauth-google`
 * navigated the reader to `user.error.oauthServerNotConfigured` — the exact
 * failure this suite exists to prevent — with every assertion still green.
 */
const oauth = vi.hoisted(() => ({
  redirect: vi.fn(),
  configured: [] as Array<string[]>,
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
  useOAuth: (options?: { oauthProviders?: string[] }) => {
    oauth.configured.push(options?.oauthProviders ?? [])
    return { providers: [], redirect: oauth.redirect }
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

  it('each button REDIRECTS to the provider it names, and only to a bonded one', async () => {
    await act(async () => {
      root.render(createElement(SocialLoginButtons))
    })

    const buttons = Array.from(
      container.querySelectorAll('[data-mol-id^="oauth-"]'),
    ) as HTMLButtonElement[]
    // The premise: there is a button to click at all.
    expect(buttons.length).toBeGreaterThan(0)

    for (const button of buttons) {
      const id = (button.getAttribute('data-mol-id') ?? '').slice('oauth-'.length)
      oauth.redirect.mockClear()
      await act(async () => {
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      })

      expect(oauth.redirect, `the ${id} button must start the OAuth dance`).toHaveBeenCalledTimes(1)
      // The id the parity check reads and the provider the click actually
      // navigates to are two independent lists in the component — this is what
      // ties them together.
      expect(
        oauth.redirect.mock.calls[0]?.[0],
        `the ${id} button navigates to a different provider than the one it names`,
      ).toBe(id)
      expect(bondedProviders(), `no bond is shipped for ${id}`).toContain(id)
    }

    // And the hook's own provider list — the third list the component carries —
    // must name the bonded providers too: the component's doc says it must, and
    // a hook configured for an unbonded provider is the same dead affordance
    // one step earlier.
    const configured = oauth.configured.at(-1) ?? []
    expect([...configured].sort()).toEqual(bondedProviders())
  })
})
