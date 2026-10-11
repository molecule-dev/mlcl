// @vitest-environment jsdom
/**
 * `ManageSubscriptionButton` POSTs to `/api/billing/portal` and sends the
 * browser to the portal URL it answers with. It checked `res.ok` but then
 * destructured `{ url }` from an unvalidated body: a 200 whose body carries no
 * `url` — a route mounted without its handler, or the mock API server with no
 * fixture for it — made `window.location.href = undefined` navigate the browser
 * to `<origin>/undefined`, silently skipping the error state the component
 * carefully implements.
 *
 * Everything is the shipped component; only the ClassMap, i18n and the network
 * are stubbed.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

interface Pending {
  url: string
  method: string | undefined
  answered: boolean
  respond: (status: number, body: unknown) => void
  /** Reject the request the way a failed network does. */
  fail: (error: Error) => void
}

/** Every request the component made, in order, with a handle to answer it. */
const pending = vi.hoisted(() => ({ requests: [] as Pending[] }))

const translate = vi.hoisted(
  () => (key: string, values?: Record<string, unknown>, options?: { defaultValue?: string }) =>
    (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
      String(values?.[name] ?? ''),
    ),
)

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => 'stub' }),
}))
vi.mock('@molecule/app-react', () => ({
  useTranslation: () => ({ t: translate }),
}))

const { ManageSubscriptionButton } =
  (await import('../../../templates/.agents/skills/examples/commerce/subscription-management/app/components/ManageSubscriptionButton')) as {
    ManageSubscriptionButton: (props: object) => ReactNode
  }

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const originalFetch = globalThis.fetch

let container: HTMLElement
let root: Root

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve))
  })
}

const text = (): string => container.textContent ?? ''

async function clickManage(): Promise<void> {
  await act(async () => {
    container.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

async function respond(status: number, body: unknown): Promise<void> {
  const request = pending.requests.find((r) => !r.answered)
  if (!request) throw new Error('no pending request')
  request.answered = true
  await act(async () => {
    request.respond(status, body)
  })
  await flush()
}

/** Reject the oldest unanswered request the way a failed network does. */
async function rejectPending(): Promise<void> {
  const request = pending.requests.find((r) => !r.answered)
  if (!request) throw new Error('no pending request')
  request.answered = true
  await act(async () => {
    request.fail(new Error('network down'))
  })
  await flush()
}

beforeEach(async () => {
  pending.requests.length = 0
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve, reject) => {
      pending.requests.push({
        url: String(input),
        method: init?.method,
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
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(createElement(ManageSubscriptionButton, {}))
  })
  await flush()
})

afterEach(async () => {
  globalThis.fetch = originalFetch
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('ManageSubscriptionButton — the portal URL is validated before it is navigated to', () => {
  it('reports the failure when a 200 carries no portal url', async () => {
    await clickManage()
    expect(pending.requests[0]?.url).toBe('/api/billing/portal')

    // `res.ok` proves the route answered, not that a portal was created.
    await respond(200, {})

    expect(text()).toContain('Could not open the billing portal')
  })

  it('reports the failure when the url is not a string', async () => {
    await clickManage()
    await respond(200, { url: 42 })

    expect(text()).toContain('Could not open the billing portal')
  })

  it('refuses a javascript: url instead of navigating to it', async () => {
    // `window.location.href` is a navigation SINK: assigning a `javascript:` URL
    // runs that script in THIS origin. The body is already treated as untrusted
    // one line up (a proxy can rewrite a failure into a 200), so a hostile or
    // rewritten `url` must not become a script — nor a `data:`/protocol-relative
    // destination that leaves the site. Each is refused like any other failed
    // portal open, which is observable here: the error text renders instead of
    // the value being handed to `location`.
    await clickManage()
    await respond(200, { url: 'javascript:alert(document.cookie)' })

    expect(text()).toContain('Could not open the billing portal')
  })

  it('refuses a data: url and a protocol-relative url', async () => {
    for (const url of ['data:text/html,<script>alert(1)</script>', '//evil.example/portal']) {
      await clickManage()
      await respond(200, { url })

      expect(text(), `url ${url} must be refused`).toContain('Could not open the billing portal')
    }
  })

  it('refuses a path the URL parser resolves off-origin (a backslash is a slash)', async () => {
    // `startsWith('/') && !startsWith('//')` called `/\evil.example` "a
    // same-origin path" — but the URL parser treats `\` exactly like `/` for a
    // special scheme, so `window.location.href = '/\evil.example'` leaves the
    // site for `https://evil.example/`. A value the docblock promises is
    // refused (a `//` destination "while looking like a path") must not pass
    // just because the second slash is written as a backslash. The guard now
    // RESOLVES the value the way the browser will and keeps only what stays on
    // this origin.
    for (const url of ['/\\evil.example', '/\\/evil.example', '\\\\evil.example']) {
      await clickManage()
      await respond(200, { url })

      expect(text(), `url ${url} must be refused`).toContain('Could not open the billing portal')
    }
  })

  it('accepts a same-origin portal path on the success path', async () => {
    // The other half of the guard: the check must not over-tighten into
    // refusing the relative shape a mounted route can answer with.
    await clickManage()
    await respond(200, { url: '/billing/portal/session' })

    expect(text()).not.toContain('Could not open the billing portal')
  })

  it('a REJECTED fetch re-enables the button and surfaces the error — never a dead control', async () => {
    // The component's own comment promises this: "finally clears the busy
    // state on EVERY path — a rejected fetch must not leave the button
    // disabled forever". No fetch double in this file could reject, so the
    // promise was untested: deleting the catch and the finally kept every test
    // green over a button that locked on the first network failure.
    await clickManage()
    expect(container.querySelector('button')?.disabled).toBe(true)

    await rejectPending()

    expect(text()).toContain('Could not open the billing portal')
    const button = container.querySelector('button')
    expect(button?.disabled).toBe(false)
    // And a retry after the failure goes back out.
    await clickManage()
    expect(pending.requests).toHaveLength(2)
  })

  it('accepts a real portal url and answers it with the exact POST the route takes', async () => {
    // What is observable here, and what is not: the success path completes by
    // assigning `window.location.href`, and jsdom's `location` is an
    // unforgeable own property — `Object.defineProperty(window, 'location', …)`
    // throws "Cannot redefine property: location", the assignment is never
    // reflected back, and the navigation the assignment triggers does not reach
    // console.error (vitest's jsdom keeps its virtual console to itself). A
    // test therefore cannot see the navigation, and the two failure cases above
    // are what pin the validation. The sibling two-factor test documents the
    // same limit.
    //
    // What the success path DOES have to get right, and can be pinned: the
    // request itself. Asserting only "exactly one request to /api/billing/portal"
    // left the METHOD unpinned — a portal open turned into a GET, or a HEAD
    // probe, would still satisfy the count.
    await clickManage()
    expect(pending.requests[0]?.url).toBe('/api/billing/portal')
    expect(pending.requests[0]?.method).toBe('POST')

    await respond(200, { url: 'https://billing.stripe.com/p/session/test' })

    expect(pending.requests).toHaveLength(1)
    expect(text()).not.toContain('Could not open the billing portal')
    // A validated url leaves the button idle again — the busy state it entered
    // while the request was in flight is cleared on every path.
    const button = container.querySelector('button')
    expect(button?.disabled).toBe(false)
    expect(button?.textContent).not.toContain('Opening')
  })
})
