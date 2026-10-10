// @vitest-environment jsdom
/**
 * The two-factor LOGIN half of the auth examples, driven against the real
 * components (only the ClassMap, i18n and the network are stubbed).
 *
 * Note on what is observable: both pages signal success by assigning
 * `window.location.href`, and jsdom's `location` is an unforgeable own property
 * (`Object.getOwnPropertyDescriptor(window.location, 'href').configurable` is
 * false; the prototype carries no `href`), so a test can neither stub it nor
 * observe the assignment. The completion signals pinned below are therefore
 * the ones jsdom CAN show: the exact request the second half sends, and that an
 * answer which issued no session leaves a failed-attempt counter instead of a
 * "no error rendered" state.
 *
 * The framework's contract is narrow and easy to get wrong (see
 * `@molecule/api-resource-user`'s `logIn` handler):
 *
 *   POST /users/log-in { email, password }
 *     → 200 (+ credential cookie)                     the session is issued
 *     → 206 { twoFactorRequired: true }               NO session, NO cookie
 *
 * The second factor is completed by POSTing the SAME credentials back to the
 * SAME route with `twoFactorToken` added — there is no other endpoint that
 * accepts a code, and the challenge mints no handle to attach one to.
 *
 * Both examples shipped the client half of that wrong, and the first one is a
 * security hole rather than a rough edge: `res.ok` is TRUE for 206, so
 * `email-password-login`'s LoginPage treated the challenge as a successful
 * login and redirected — the user arrived with no session and the account's
 * second factor was never asked for. `two-factor-auth`'s LoginVerifyPage posted
 * `{ code }` to `/api/login/verify`, a route that no part of the framework or
 * the example implements, so the step could never succeed at all.
 *
 * @module
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface FetchRequest {
  url: string
  body: unknown
  answered: boolean
  respond: (status: number, body: unknown) => void
}

const fetches = vi.hoisted(() => ({ requests: [] as FetchRequest[] }))

vi.mock('@molecule/app-ui', () => ({
  // Every ClassMap helper collapses to `undefined`, which React accepts for both
  // `className` and `style` (a string would be rejected as a `style` value).
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
      (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
        String(values?.[name] ?? ''),
      ),
  }),
}))

const { LoginPage } =
  (await import('../../../templates/.agents/skills/examples/auth/email-password-login/app/pages/LoginPage.js')) as {
    LoginPage: (props: object) => ReactNode
  }

const { LoginVerifyPage } =
  (await import('../../../templates/.agents/skills/examples/auth/two-factor-auth/app/pages/LoginVerifyPage.js')) as {
    LoginVerifyPage: (props: { email: string; password: string }) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

async function mount(element: ReactNode): Promise<void> {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(element)
  })
  await flush()
}

/** Type into an input the way a real user does (native value setter + input event). */
async function typeInto(selector: string, value: string): Promise<void> {
  const input = container.querySelector(selector) as HTMLInputElement | null
  if (!input) throw new Error(`no input matching ${selector}`)
  const setNativeValue = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set
  await act(async () => {
    setNativeValue?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await flush()
}

async function submit(): Promise<void> {
  const form = container.querySelector('form')
  if (!form) throw new Error('no form rendered')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  await flush()
}

/** Answer the oldest unanswered request whose URL contains `fragment`. */
async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const request = fetches.requests.find((r) => !r.answered && r.url.includes(fragment))
  if (!request) throw new Error(`no pending request for ${fragment}`)
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

const bodyOf = (index: number): unknown => JSON.parse(String(fetches.requests[index]?.body))
const text = (): string => container.textContent ?? ''

beforeEach(() => {
  fetches.requests.length = 0
  globalThis.fetch = ((input: unknown, init?: { body?: unknown }) =>
    new Promise((resolve) => {
      fetches.requests.push({
        url: String(input),
        body: init?.body,
        answered: false,
        respond: (status, body) =>
          resolve({
            ok: status >= 200 && status < 300,
            status,
            json: async () => body,
          }),
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('email-password-login — a 2FA challenge is NOT a successful login', () => {
  it('collects the code instead of navigating on the 206 that issued no session', async () => {
    await mount(createElement(LoginPage, {}))

    await typeInto('#login-email', 'ada@calc.dev')
    await typeInto('#login-password', 'hunter2-secret')
    await submit()

    // The first POST carries the credentials and no token.
    expect(fetches.requests).toHaveLength(1)
    expect(fetches.requests[0].url).toBe('/api/users/log-in')
    expect(bodyOf(0)).toEqual({ email: 'ada@calc.dev', password: 'hunter2-secret' })

    // 206 is a 2xx, so `res.ok` is true — the pre-fix page redirected to `/`
    // here on a response that minted no session and never asked for the code.
    await respond('/api/users/log-in', 206, { twoFactorRequired: true })

    expect(container.querySelector('[data-mol-id="login-two-factor-code"]')).not.toBeNull()
    // The password step is replaced by the code step (the credentials stay in
    // state — the retry needs them).
    expect(container.querySelector('#login-email')).toBeNull()
    expect(text()).not.toContain('Login failed')
  })

  it('finishes the login by re-POSTing the credentials WITH the code', async () => {
    await mount(createElement(LoginPage, {}))
    await typeInto('#login-email', 'ada@calc.dev')
    await typeInto('#login-password', 'hunter2-secret')
    await submit()
    await respond('/api/users/log-in', 206, { twoFactorRequired: true })

    await typeInto('[data-mol-id="login-two-factor-code"]', '123456')
    await submit()

    // The code goes to the ONLY route that accepts one, with the credentials it
    // needs — the challenge created no session to attach a bare code to.
    expect(fetches.requests).toHaveLength(2)
    expect(fetches.requests[1].url).toBe('/api/users/log-in')
    expect(bodyOf(1)).toEqual({
      email: 'ada@calc.dev',
      password: 'hunter2-secret',
      twoFactorToken: '123456',
    })

    await respond('/api/users/log-in', 200, { props: { id: 'u1' } })
    // A 200 DID issue the session, so it must not be reported as a wrong code
    // or counted as a failed attempt. (The page's success action is the
    // jsdom-unobservable navigation — see the module doc — so the completing
    // half is pinned by the request assertions above plus this pair; the old
    // assertion was `not.toContain('Wrong code')` alone, which every state that
    // renders no error satisfies, including a dropped success branch.)
    expect(text()).not.toContain('Wrong code')
    expect(text()).not.toContain('failed attempts')
  })

  it('keeps the code step and reports a rejected code', async () => {
    await mount(createElement(LoginPage, {}))
    await typeInto('#login-email', 'ada@calc.dev')
    await typeInto('#login-password', 'hunter2-secret')
    await submit()
    await respond('/api/users/log-in', 206, { twoFactorRequired: true })

    await typeInto('[data-mol-id="login-two-factor-code"]', '999999')
    await submit()
    await respond('/api/users/log-in', 403, { error: 'user.error.invalidTwoFactorToken' })

    expect(text()).toContain('user.error.invalidTwoFactorToken')
    // Still on the code step — a retry must not need the password again.
    expect(container.querySelector('[data-mol-id="login-two-factor-code"]')).not.toBeNull()
  })
})

describe('two-factor-auth — the code step posts to the real log-in route', () => {
  it('sends email + password + twoFactorToken to /api/users/log-in', async () => {
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '123456')
    await submit()

    // Pre-fix this posted `{ code }` to `/api/login/verify`, which neither the
    // framework nor the example implements — the step could never succeed.
    expect(fetches.requests).toHaveLength(1)
    expect(fetches.requests[0].url).toBe('/api/users/log-in')
    expect(bodyOf(0)).toEqual({
      email: 'ada@calc.dev',
      password: 'hunter2-secret',
      twoFactorToken: '123456',
    })
  })

  it('counts a rejected code as an attempt and shows the retry counter', async () => {
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '000000')
    await submit()
    await respond('/api/users/log-in', 403, { error: 'Wrong code' })

    expect(text()).toContain('Wrong code')
    expect(text()).toContain('(failed attempts: 1)')
  })

  it('does not report a throttled challenge as a wrong code', async () => {
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '123456')
    await submit()
    await respond('/api/users/log-in', 429, { error: 'Too many attempts' })

    expect(text()).toContain('Too many attempts')
    expect(text()).not.toContain('failed attempts')
  })

  it('does not treat a 2xx that issued no session as a completed login', async () => {
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '123456')
    await submit()

    // `res.ok` is true for ANY 2xx, and the challenge answer is the documented
    // 206 `{ twoFactorRequired: true }` (or the same body behind a proxy that
    // rewrote the status to 200 — the case email-password-login's LoginPage
    // guards with the body flag). No session was issued, so this must NOT
    // navigate: it is another failed attempt, and the code step stays.
    await respond('/api/users/log-in', 200, { twoFactorRequired: true })

    expect(text()).toContain('(failed attempts: 1)')
    expect(container.querySelector('[data-mol-id="totp-login-code"]')).not.toBeNull()
  })

  it('counts the challenge status itself (206) as a failed attempt, not a login', async () => {
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '123456')
    await submit()
    await respond('/api/users/log-in', 206, { twoFactorRequired: true })

    expect(text()).toContain('(failed attempts: 1)')
    expect(text()).not.toContain('Wrong code — try again')
  })
})
