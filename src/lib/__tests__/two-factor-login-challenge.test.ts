// @vitest-environment jsdom
/**
 * The two-factor LOGIN half of the auth examples, driven against the real
 * components (only the ClassMap, i18n and the network are stubbed).
 *
 * Note on what is observable: both pages signal success by assigning
 * `window.location.href`. In this vitest jsdom environment `window.location`
 * is a CONFIGURABLE accessor (verified: `Object.getOwnPropertyDescriptor(window,
 * 'location')` reports `configurable: true`), so the tests replace it with a
 * plain object and assert the assignment directly — the completion branch is
 * pinned by its effect, not only by the request that precedes it. (An earlier
 * revision of this suite documented `location` as unforgeable and the jsdom
 * "Not implemented: navigation" report as suppressed; neither holds under
 * vitest 4.1.11 — the stub below is the proof, and the navigation report does
 * reach `console.error`.)
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
  /** Reject the request the way a failed network does. */
  fail: (error: Error) => void
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

const { EnableTwoFactorPage } =
  (await import('../../../templates/.agents/skills/examples/auth/two-factor-auth/app/pages/EnableTwoFactorPage.js')) as {
    EnableTwoFactorPage: (props: object) => ReactNode
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

/**
 * The stub `window.location` the success branches write into, plus the original
 * property descriptor to restore. Both pages signal "the session was issued" by
 * assigning `window.location.href = '/'`; the stub turns that assignment into
 * something a test can read — and deleting a success branch (the request goes
 * out, the answer is dropped on the floor) fails the assertions below.
 */
let locationStub: { href: string }
const originalLocation = Object.getOwnPropertyDescriptor(window, 'location')

beforeEach(() => {
  fetches.requests.length = 0
  locationStub = { href: 'http://localhost/login' }
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: locationStub,
  })
  globalThis.fetch = ((input: unknown, init?: { body?: unknown }) =>
    new Promise((resolve, reject) => {
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
        fail: reject,
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  if (originalLocation !== undefined) {
    Object.defineProperty(window, 'location', originalLocation)
  }
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
    // or counted as a failed attempt — and the success branch must actually
    // RUN: the request above is only the client's half of the flow. The
    // navigation is the completion signal, read off the stubbed location (see
    // the note at the top): a deleted or reordered success branch (the answer
    // dropped on the floor, the page re-rendering the form) leaves the stub
    // untouched and fails here, where an earlier revision of this suite —
    // before `window.location` proved stubbable — could only pin the request.
    expect(locationStub.href, 'the 200 must complete the login by navigating').toBe('/')
    expect(text()).not.toContain('Wrong code')
    // A 200 must leave NO error on screen. `failed attempts` cannot be that
    // signal on THIS page: the attempt counter lives on `two-factor-auth`'s
    // LoginVerifyPage, while this page's only error surface renders `error` —
    // the assertion was therefore true for every possible render and could
    // never fail. What a mishandled 200 leaves behind here is one of this
    // page's own failure strings (the `!res.ok` branch's defaults), and a
    // navigation assertion cannot see it: a page that both navigated and
    // rendered an error would pass that one.
    expect(text(), 'a session-issuing 200 must not report a login failure').not.toMatch(
      /Login failed|Network error/,
    )
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

  it('a session-issuing 200 completes the login — the answer is handled, not dropped', async () => {
    // The success branch was never asserted: every other test here stops at a
    // rejected/throttled/challenge answer, so deleting the `res.ok` branch (the
    // POST goes out, the 200 lands, nothing happens, no session) kept the whole
    // suite green. The navigation is the only observable the page offers, and
    // the stubbed location makes it readable — see the note at the top.
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '123456')
    await submit()
    await respond('/api/users/log-in', 200, { props: { id: 'u1' } })

    expect(locationStub.href, 'the 200 must complete the login by navigating').toBe('/')
    // The counter renders only INSIDE the error paragraph, and this test's 200
    // increments nothing — so `failed attempts` (true here for a broken
    // success branch too: the fall-through sets an error without touching the
    // counter) is not the signal. What a mishandled 200 leaves on screen is one
    // of the page's own failure strings.
    expect(text(), 'the 200 must not be reported as a failure').not.toMatch(
      /Network error|Wrong code|failed attempts/,
    )
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

  it('a REJECTED verify frees the form — never a dead verify button', async () => {
    // submit()'s finally promises this on every path; no fetch double here
    // could reject, so deleting the catch and the finally kept every test
    // green over a verify button locked by the first network failure.
    await mount(
      createElement(LoginVerifyPage, { email: 'ada@calc.dev', password: 'hunter2-secret' }),
    )

    await typeInto('[data-mol-id="totp-login-code"]', '123456')
    await submit()

    const request = fetches.requests.find((r) => !r.answered && r.url.includes('/api/users/log-in'))
    if (!request) throw new Error('no pending verify request to reject')
    request.answered = true
    await act(async () => {
      request.fail(new Error('network down'))
    })
    await flush()

    expect(text()).toContain('Network error')
    expect(text()).not.toContain('failed attempts')
    const button = container.querySelector('button') as HTMLButtonElement
    expect(button.disabled).toBe(false)
    // A retry goes back out.
    await submit()
    expect(fetches.requests.filter((r) => r.url.includes('/api/users/log-in'))).toHaveLength(2)
  })

  it('the ENABLE page declares success only on the handler’s own confirmation', async () => {
    // The enroll half of this page already validates its 2xx body (a body with
    // no `secret`/`recoveryCodes` is the failed enroll, not a white screen); the
    // verify half took ANY 2xx as "the code was accepted" and announced
    // "Two-factor authentication enabled" over an account where the second
    // factor was still OFF — the shape the mock API server's no-fixture answer
    // (`200 {}`) and a proxy-rewritten failure both produce, and the page offers
    // no way back from it. The handler's success body is `{ ok: true }`
    // (api/handlers/totp.ts, the branch that promotes the pending secret).
    await mount(createElement(EnableTwoFactorPage, {}))
    const start = container.querySelector('button') as HTMLButtonElement
    await act(async () => {
      start.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await respond('/api/2fa/enroll', 200, {
      secret: 'JBSWY3DPEHPK3PXP',
      QRImageUrl: '',
      recoveryCodes: ['aaaa-bbbb', 'cccc-dddd'],
    })
    expect(text()).toContain('JBSWY3DPEHPK3PXP')

    await typeInto('input', '123456')
    await submit()
    await respond('/api/2fa/verify', 200, {})

    expect(text(), 'a 2xx carrying no confirmation must not claim 2FA is enabled').not.toContain(
      'Two-factor authentication enabled',
    )
    // Still on the code step, so the user can retry.
    expect(container.querySelector('input')).not.toBeNull()

    // …and the handler’s real answer completes the enrollment.
    await typeInto('input', '123456')
    await submit()
    await respond('/api/2fa/verify', 200, { ok: true })
    expect(text()).toContain('Two-factor authentication enabled')
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
