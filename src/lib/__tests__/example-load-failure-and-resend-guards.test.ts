// @vitest-environment jsdom
/**
 * Failure paths in three example slices that reported success — or nothing —
 * while leaving the wrong state behind:
 *
 * 1. `sortable-table`'s `OrdersPage` — a page/sort/filter request that FAILED
 *    left `pageIndex` (the page the user asked for, and the number the paginator
 *    renders) out of step with `page` (the rows that are actually on screen),
 *    and said nothing at all. Clicking "Next" on a flaky connection showed page
 *    1's rows under the paginator's page 2 with nothing on screen saying so. It
 *    now surfaces the failure, and the rows stay: the paginator is left on the
 *    page the reader asked for (that optimism is what lets two quick clicks
 *    request pages 2 and 3 — the shipped choice, asserted below), and the
 *    notice is what discloses that the rows below are the last page that
 *    loaded. Re-paginating the paginator back is NOT the fix and is not what
 *    the code does.
 * 2. `email-verification`'s `VerifyEmailPage` — `resend()` had no in-flight
 *    guard, and the endpoint (api/handlers/verify-email.ts) rate-limits resends
 *    per user. A double click sent two: the first created and mailed a link, the
 *    second came back 429 and the page reported "Could not send a new link —
 *    try again" for a link that HAD been sent. A 429 also now says what it is
 *    instead of inviting a retry the endpoint will refuse again.
 * 3. `verify-email.ts`'s `POST /request` persisted the token row BEFORE the
 *    mail send, so a provider rejection (bad key, outage) left an undelivered
 *    token behind, one per failed attempt. It also kept every row a send ever
 *    minted — the TTL expires a token, it does not delete it — so a successful
 *    resend now supersedes the user's earlier links instead of stacking one
 *    more row per request.
 *
 * The components are the shipped ones (ClassMap + i18n + the two UI primitives
 * are stubbed); the handler is driven through its REAL router, with only the
 * bonds mocked, the way the sibling handler suites do it.
 *
 * @module
 */

import { act, createElement, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ---------------------------------------------------------------------------
// Doubles
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string
  method: string
  answered: boolean
  respond: (status: number, body: unknown) => void
  fail: (error: Error) => void
}

const fetches = vi.hoisted(() => ({ calls: [] as FetchCall[] }))

const translate = (
  key: string,
  values?: Record<string, unknown>,
  options?: { defaultValue?: string },
): string =>
  (options?.defaultValue ?? key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) =>
    String(values?.[name] ?? ''),
  )

vi.mock('@molecule/app-ui', () => ({
  getClassMap: () => new Proxy({}, { get: () => () => undefined }),
}))

vi.mock('@molecule/app-react', () => ({ useTranslation: () => ({ t: translate }) }))

// The table renders its rows as list items so an assertion can tell WHICH
// page's rows are on screen; the paginator exposes the page it is showing. The
// shared component also answers an EMPTY, not-loading list with its
// `emptyMessage`, so the mock renders that too (outside the <ul>, leaving the
// row assertions untouched) — an assertion can then tell an authoritative
// "empty" from a load that never happened.
vi.mock('@molecule/app-data-table-ui-react', () => ({
  DataTableCard: (props: {
    rows: Array<{ id: string }>
    loading?: boolean
    emptyMessage?: string
  }) =>
    createElement('div', {}, [
      createElement(
        'ul',
        { key: 'rows', 'data-loading': String(Boolean(props.loading)) },
        props.rows.map((r) => createElement('li', { key: r.id }, r.id)),
      ),
      props.rows.length === 0 && !props.loading && props.emptyMessage
        ? createElement('p', { key: 'empty', 'data-empty': '' }, props.emptyMessage)
        : null,
    ]),
}))

vi.mock('@molecule/app-pagination-bar-react', () => ({
  PaginationBar: (props: { page: number; onPageChange: (page: number) => void }) =>
    createElement(
      'div',
      { 'data-page': String(props.page) },
      createElement(
        'button',
        {
          type: 'button',
          'aria-label': 'Next page',
          onClick: () => props.onPageChange(props.page + 1),
        },
        'Next',
      ),
    ),
}))

// The handler's bonds.
const database = vi.hoisted(() => ({
  create: vi.fn(),
  deleteById: vi.fn(),
  deleteMany: vi.fn(),
  findById: vi.fn(),
  findMany: vi.fn(),
  updateById: vi.fn(),
}))
const emails = vi.hoisted(() => ({ sendMail: vi.fn() }))
const rateLimit = vi.hoisted(() => ({ consume: vi.fn() }))

vi.mock('@molecule/api-database', () => database)
vi.mock('@molecule/api-emails', () => emails)
vi.mock('@molecule/api-rate-limit', () => rateLimit)
vi.mock('@molecule/api-i18n', () => ({
  t: (_key: string, _values?: unknown, options?: { defaultValue?: string }) =>
    options?.defaultValue ?? _key,
}))

const { OrdersPage } =
  (await import('../../../templates/.agents/skills/examples/data-display/sortable-table/app/pages/OrdersPage.js')) as {
    OrdersPage: () => ReactNode
  }
const { VerifyEmailPage } =
  (await import('../../../templates/.agents/skills/examples/auth/email-verification/app/pages/VerifyEmailPage.js')) as {
    VerifyEmailPage: () => ReactNode
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

const text = (): string => container.textContent ?? ''

async function respond(fragment: string, status: number, body: unknown): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.respond(status, body)
  })
  await flush()
}

async function rejectPending(fragment: string): Promise<void> {
  const call = fetches.calls.find((c) => !c.answered && c.url.includes(fragment))
  if (!call) throw new Error(`no pending fetch to reject for ${fragment}`)
  call.answered = true
  await act(async () => {
    call.fail(new Error('network down'))
  })
  await flush()
}

const fetchCount = (fragment: string): number =>
  fetches.calls.filter((c) => c.url.includes(fragment)).length

const postCount = (fragment: string): number =>
  fetches.calls.filter((c) => c.url.includes(fragment) && c.method === 'POST').length

async function clickByLabel(label: string): Promise<void> {
  const el = container.querySelector(`[aria-label="${label}"]`)
  if (!el) throw new Error(`no control labelled ${label}`)
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
  await flush()
}

const rows = (): string[] =>
  Array.from(container.querySelectorAll('li')).map((li) => li.textContent ?? '')

beforeEach(() => {
  fetches.calls.length = 0
  vi.clearAllMocks()
  database.deleteMany.mockResolvedValue({ data: [], affected: 1 })
  rateLimit.consume.mockResolvedValue({ allowed: true })
  emails.sendMail.mockResolvedValue(undefined)
  globalThis.fetch = ((input: unknown, init?: { method?: string }) =>
    new Promise((resolve, reject) => {
      fetches.calls.push({
        url: String(input),
        method: init?.method ?? 'GET',
        answered: false,
        respond: (status, body) =>
          resolve({ ok: status >= 200 && status < 300, status, json: async () => body }),
        fail: reject,
      })
    })) as typeof globalThis.fetch
})

afterEach(async () => {
  window.history.replaceState({}, '', '/')
  if (root && document.body.contains(container)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

describe('orders page — a failed page load is disclosed, not silent', () => {
  it('keeps the rows it has and says the load failed', async () => {
    await mount(createElement(OrdersPage, {}))

    await respond('/api/orders', 200, {
      rows: [{ id: 'o-page-1' }],
      total: 60,
    })
    expect(rows()).toEqual(['o-page-1'])
    expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('1')

    // Next page: the request fails.
    await clickByLabel('Next page')
    expect(fetchCount('offset=25')).toBe(1)
    await rejectPending('/api/orders')

    // The failure is visible. The rows stay (they are not blanked — the slice
    // documents that choice) and the paginator stays optimistic (it moved on
    // the click; that is what lets two quick clicks request pages 2 and 3, see
    // superseded-fetch-response.test.ts) — so the ONE thing that must change is
    // that the reader is told the rows below are the last page that loaded.
    expect(text()).toContain('Could not load these orders')
    expect(rows()).toEqual(['o-page-1'])
    expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('2')
  })

  it('a FIRST-load failure does not let the table answer "No orders found."', async () => {
    await mount(createElement(OrdersPage, {}))
    // Nothing has loaded yet — the very first request fails outright.
    await rejectPending('/api/orders')

    // An empty state is an ANSWER ("there are no orders"), and no request
    // answered: the first-load failure used to render "No orders found." under
    // an alert whose copy — "the rows below are the last page that loaded" —
    // described rows that do not exist.
    expect(text()).not.toContain('No orders found.')
    expect(text()).toContain('nothing has been read yet')
    expect(rows()).toEqual([])
  })

  it('the positive twin: a page load that succeeds replaces the rows and clears the notice', async () => {
    await mount(createElement(OrdersPage, {}))
    await respond('/api/orders', 200, { rows: [{ id: 'o-page-1' }], total: 60 })

    await clickByLabel('Next page')
    await rejectPending('/api/orders')
    expect(text()).toContain('Could not load these orders')

    await clickByLabel('Next page')
    await respond('/api/orders', 200, { rows: [{ id: 'o-page-2' }], total: 60 })

    expect(rows()).toEqual(['o-page-2'])
    expect(container.querySelector('[data-page]')?.getAttribute('data-page')).toBe('3')
    expect(text()).not.toContain('Could not load these orders')
  })
})

describe('verify-email — a resend in flight is one resend', () => {
  async function mountExpiredPage(): Promise<void> {
    window.history.replaceState({}, '', '/verify?token=stale-token')
    await mount(createElement(VerifyEmailPage, {}))
    await respond('/api/verify', 410, { error: 'Link expired' })
  }

  it('a double click sends one request, not a rate-limited second one', async () => {
    await mountExpiredPage()
    expect(text()).toContain('Link expired')

    const button = container.querySelector('button') as HTMLButtonElement
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    // The second click races the first. Without the in-flight guard it fired a
    // second POST, which the endpoint answers 429 — and the page reported that
    // as "Could not send a new link — try again" for a link that HAD been sent.
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    expect(postCount('/api/verify/request')).toBe(1)
    await respond('/api/verify/request', 200, { ok: true })
    expect(text()).toContain('sent a new link')
  })

  it('a 429 is reported as rate limiting, not as a retryable failure', async () => {
    await mountExpiredPage()

    const button = container.querySelector('button') as HTMLButtonElement
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()

    // One request in flight: the control is disabled, so a second click cannot
    // send the duplicate that the endpoint would answer 429.
    expect(postCount('/api/verify/request')).toBe(1)
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    expect(postCount('/api/verify/request')).toBe(1)

    await respond('/api/verify/request', 429, { error: 'Too many requests' })
    expect(text()).toContain('Too many link requests')
    expect(text()).not.toContain('Could not send a new link')
  })

  it('the positive twin: a successful resend says the link went out', async () => {
    await mountExpiredPage()

    const button = container.querySelector('button') as HTMLButtonElement
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await respond('/api/verify/request', 200, { ok: true })

    expect(text()).toContain('sent a new link')
  })

  it('a 2xx that mailed nothing (already verified) does not claim a link was sent', async () => {
    // `/api/verify/request` answers `{ ok: true, alreadyVerified: true }`
    // WITHOUT minting a token or calling sendMail when the account is already
    // verified — reachable here because verifying through one link does not
    // invalidate a user's other outstanding tokens, so a reader can arrive on
    // this page (expired link in hand) with the address already proven. Reading
    // only `res.ok` told them "We've sent a new link to your email" about a
    // message nobody sent.
    await mountExpiredPage()

    const button = container.querySelector('button') as HTMLButtonElement
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await flush()
    await respond('/api/verify/request', 200, { ok: true, alreadyVerified: true })

    expect(text()).toContain('already verified')
    expect(text()).not.toContain('sent a new link')
  })
})

// ---------------------------------------------------------------------------
// The handler, through its real router
// ---------------------------------------------------------------------------

type Handle = (req: unknown, res: unknown, next?: () => void) => Promise<void> | void

const { requestMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/auth/email-verification/api/handlers/verify-email.js')) as {
      default: {
        stack: Array<{ route?: { path?: string; stack: Array<{ handle: Handle }> } }>
      }
    }
  const layer = mod.default.stack.find((l) => l.route?.path === '/request')
  if (!layer?.route) throw new Error('verify-email router exported no POST /request route')
  return { requestMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

const makeRes = (): {
  locals: { session?: { userId: string } }
  statusCode: number
  body: unknown
  status: (code: number) => unknown
  json: (payload: unknown) => unknown
} => {
  const res = {
    locals: {} as { session?: { userId: string } },
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(payload: unknown) {
      res.body = payload
      return res
    },
  }
  return res
}

async function postRequest(): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  res.locals.session = { userId: 'user-1' }
  const req = { body: {} }
  // Run the chain step by step: a middleware that passes on synchronously
  // (requireAuth) is followed by the next one, and a terminal handler's own
  // promise is AWAITED — otherwise its rejection floats as an unhandled
  // rejection and the assertions below read a response nothing has written yet.
  for (let i = 0; i < requestMiddlewares.length; i++) {
    let passedOn = false
    const result = requestMiddlewares[i](req, res, () => {
      passedOn = true
    })
    await Promise.resolve(result)
    if (!passedOn) break
  }
  return res
}

describe('verify-email POST /request — a failed send leaves no token behind', () => {
  it('drops the token row when the provider rejects the send', async () => {
    database.findById.mockResolvedValue({ id: 'user-1', email: 'a@test.dev', emailVerified: false })
    database.create.mockResolvedValue({ data: { id: 'tok-1' }, affected: 1 })
    emails.sendMail.mockRejectedValue(new Error('provider down'))

    await expect(postRequest()).rejects.toThrow('provider down')

    // The row was created first, so the failure path has to undo it: without
    // this, each failed resend left an undelivered token in the table.
    expect(database.create).toHaveBeenCalledTimes(1)
    const created = database.create.mock.calls[0][1] as { token_hash: string }
    expect(database.deleteMany).toHaveBeenCalledWith('email_verification_tokens', [
      { field: 'token_hash', operator: '=', value: created.token_hash },
    ])
  })

  it('the positive twin: a delivered send keeps the token and answers ok', async () => {
    database.findById.mockResolvedValue({ id: 'user-1', email: 'a@test.dev', emailVerified: false })
    database.create.mockResolvedValue({ data: { id: 'tok-1' }, affected: 1 })

    const res = await postRequest()

    expect(res.body).toEqual({ ok: true })
    // The DELIVERED token is never the one rolled back. (A successful send does
    // delete the user's OTHER tokens — one link per user, see the supersede test
    // below — so the assertion is scoped to this row's hash, not to "no delete
    // at all".)
    const created = database.create.mock.calls[0][1] as { token_hash: string }
    expect(database.deleteMany).not.toHaveBeenCalledWith('email_verification_tokens', [
      { field: 'token_hash', operator: '=', value: created.token_hash },
    ])
    expect(emails.sendMail).toHaveBeenCalledTimes(1)
  })

  it('a delivered resend supersedes the earlier links, so rows cannot accumulate', async () => {
    // One row per resend request, kept forever: the TTL gates acceptance but
    // deletes nothing (an expired row goes away only when someone visits that
    // exact link), so without this the table grew with the number of resends
    // ever made — the rate limit bounds the RATE, not the total. The new link
    // replaces the old ones; the row just minted is spared.
    database.findById.mockResolvedValue({ id: 'user-1', email: 'a@test.dev', emailVerified: false })
    database.create.mockResolvedValue({ data: { id: 'tok-2' }, affected: 1 })

    const res = await postRequest()

    expect(res.body).toEqual({ ok: true })
    const created = database.create.mock.calls[0][1] as { token_hash: string }
    expect(database.deleteMany).toHaveBeenCalledWith('email_verification_tokens', [
      { field: 'user_id', operator: '=', value: 'user-1' },
      { field: 'token_hash', operator: '!=', value: created.token_hash },
    ])
  })

  it('a supersede that fails does not fail the send it followed', async () => {
    // The mail is already delivered: a store failure on the housekeeping delete
    // must not reach the page as "could not send a new link".
    database.findById.mockResolvedValue({ id: 'user-1', email: 'a@test.dev', emailVerified: false })
    database.create.mockResolvedValue({ data: { id: 'tok-3' }, affected: 1 })
    database.deleteMany.mockRejectedValue(new Error('store down'))

    const res = await postRequest()

    expect(res.body).toEqual({ ok: true })
    expect(emails.sendMail).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// GET / — the verification itself, and the housekeeping after it
// ---------------------------------------------------------------------------

const { verifyMiddlewares } = await (async () => {
  const mod =
    (await import('../../../templates/.agents/skills/examples/auth/email-verification/api/handlers/verify-email.js')) as {
      default: {
        stack: Array<{
          route?: {
            path?: string
            methods?: Record<string, boolean>
            stack: Array<{ handle: Handle }>
          }
        }>
      }
    }
  const layer = mod.default.stack.find((l) => l.route?.path === '/' && l.route.methods?.get)
  if (!layer?.route) throw new Error('verify-email router exported no GET / route')
  return { verifyMiddlewares: layer.route.stack.map((l) => l.handle) }
})()

/** Drive the real GET / chain with a token query, awaiting the terminal handler. */
async function getVerify(token: string): Promise<ReturnType<typeof makeRes>> {
  const res = makeRes()
  const req = { query: { token } }
  for (let i = 0; i < verifyMiddlewares.length; i++) {
    let passedOn = false
    const result = verifyMiddlewares[i](req, res, () => {
      passedOn = true
    })
    await Promise.resolve(result)
    if (!passedOn) break
  }
  return res
}

const liveTokenRow = (): void => {
  database.findMany.mockResolvedValue([
    {
      id: 'tok-1',
      user_id: 'user-1',
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  ])
  database.updateById.mockResolvedValue({ data: {}, affected: 1 })
  database.deleteById.mockResolvedValue({ data: {}, affected: 1 })
}

describe('verify-email GET / — a verified account is reported as verified', () => {
  it('answers ok when the used token cannot be deleted', async () => {
    // Two writes make up this route: mark the user verified, then drop the
    // single-use token. Letting the SECOND one's failure reject the handler
    // reported a 500 for a verification that had already happened — the visitor
    // was told the link failed while the account was verified — and left the
    // token row behind to be found again. The verification is the outcome; the
    // clear is housekeeping.
    liveTokenRow()
    database.deleteById.mockRejectedValue(new Error('transient db error'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const res = await getVerify('a'.repeat(32))

      expect(database.updateById).toHaveBeenCalledWith('users', 'user-1', { emailVerified: true })
      expect(res.statusCode, 'a verified account must not be reported as an error').toBe(0)
      expect(res.body).toEqual({ ok: true })
      // The cleanup failure is not silent: it is logged with the row it was for.
      expect(errorSpy).toHaveBeenCalledWith(
        'verify-email: could not drop the used verification token',
        expect.objectContaining({ userId: 'user-1', tokenId: 'tok-1' }),
      )
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('the positive twin: a clean verify marks the user verified and drops the token once', async () => {
    liveTokenRow()

    const res = await getVerify('a'.repeat(32))

    expect(database.updateById).toHaveBeenCalledWith('users', 'user-1', { emailVerified: true })
    expect(database.deleteById).toHaveBeenCalledWith('email_verification_tokens', 'tok-1')
    expect(res.body).toEqual({ ok: true })
  })

  it('answers 410 (expired) even when the expired token cannot be deleted', async () => {
    // The expiry branch drops the stale row as housekeeping too, and it was the
    // one delete left unguarded: a transient store failure REJECTED the handler,
    // so the page's 5xx arm rendered "Could not check this link" for a link that
    // is simply past its TTL, and the row stayed behind regardless. The answer
    // must be the expired-link one either way — and the account must not be
    // marked verified by an expired link.
    database.findMany.mockResolvedValue([
      {
        id: 'tok-expired',
        user_id: 'user-1',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      },
    ])
    database.deleteById.mockRejectedValue(new Error('transient db error'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const res = await getVerify('a'.repeat(32))

      expect(res.statusCode, 'an expired link must answer 410, not reject the handler').toBe(410)
      expect(res.body).toMatchObject({ error: expect.stringContaining('xpired') })
      expect(database.updateById).not.toHaveBeenCalled()
      // …and the failure it swallowed is not silent: it names the row it was for.
      expect(errorSpy).toHaveBeenCalledWith(
        'verify-email: could not drop the expired verification token',
        expect.objectContaining({ userId: 'user-1', tokenId: 'tok-expired' }),
      )
    } finally {
      errorSpy.mockRestore()
    }
  })
})
