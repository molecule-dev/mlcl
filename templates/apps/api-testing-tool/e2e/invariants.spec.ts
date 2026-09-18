import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { apiRequest, signup } from './_helpers.js'

/**
 * Backend-invariant suite. Each test asserts that a primary action's
 * read-after-write actually held — not just that the click fired. Past
 * agents have shipped flagship apps where Pricing buttons fired POSTs
 * that returned 200 but planKey never flipped, where /requests/:id
 * execute returned a fake response without ever touching the network,
 * etc. These tests prevent that exact failure mode.
 */

test.describe('backend invariants', () => {
  test('POST /api/requests persists the request and GET /api/requests reflects it', async ({
    page,
  }) => {
    await signup(page)

    const before = await apiRequest<unknown[]>(page, 'GET', '/api/requests')
    const beforeCount = Array.isArray(before.body) ? before.body.length : 0

    const created = await apiRequest<{ id?: string; method?: string; url?: string }>(
      page,
      'POST',
      '/api/requests',
      { name: 'invariant', method: 'GET', url: 'https://httpbin.org/get' },
    )
    expect(created.status, 'POST /api/requests must succeed').toBeLessThan(300)
    expect(created.body.id, 'response must include id').toBeTruthy()
    expect(created.body.method).toBe('GET')
    expect(created.body.url).toBe('https://httpbin.org/get')

    const after = await apiRequest<unknown[]>(page, 'GET', '/api/requests')
    expect(Array.isArray(after.body) ? after.body.length : 0).toBe(beforeCount + 1)
  })

  test('POST /api/requests/:id/execute fires the upstream call and writes a history row', async ({
    page,
  }) => {
    await signup(page)

    const created = await apiRequest<{ id?: string }>(page, 'POST', '/api/requests', {
      name: 'execute-invariant',
      method: 'GET',
      url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
    })
    expect(created.status).toBeLessThan(300)
    expect(created.body.id).toBeTruthy()

    const exec = await apiRequest<{ status?: number; body?: unknown; duration_ms?: number }>(
      page,
      'POST',
      `/api/requests/${created.body.id}/execute`,
      {},
    )
    expect(exec.status, 'execute endpoint must return 2xx').toBeLessThan(300)
    expect(
      exec.body.status,
      'execute response must reflect the real upstream HTTP status (not silently fake 200)',
    ).toBeGreaterThanOrEqual(200)
    expect(
      exec.body.duration_ms,
      'duration must be a real, positive number — proves the upstream call ran',
    ).toBeGreaterThan(0)

    const hist = await apiRequest<Array<{ request_id?: string; status_code?: number }>>(
      page,
      'GET',
      '/api/history?limit=10',
    )
    expect(hist.status).toBe(200)
    const ours = (hist.body || []).find((row) => row.request_id === created.body.id)
    expect(ours, 'a history row must exist for the executed request').toBeTruthy()
    expect(
      ours?.status_code,
      'history row must capture the upstream status',
    ).toBeGreaterThanOrEqual(200)
  })

  test('POST /api/collections persists and GET /api/collections returns the new row', async ({
    page,
  }) => {
    await signup(page)

    const before = await apiRequest<unknown[]>(page, 'GET', '/api/collections')
    const beforeCount = Array.isArray(before.body) ? before.body.length : 0

    const created = await apiRequest<{ id?: string; name?: string }>(
      page,
      'POST',
      '/api/collections',
      { name: 'Invariant collection', description: 'created by test' },
    )
    expect(created.status).toBeLessThan(300)
    expect(created.body.id).toBeTruthy()
    expect(created.body.name).toBe('Invariant collection')

    const after = await apiRequest<Array<{ id?: string }>>(page, 'GET', '/api/collections')
    const grew = Array.isArray(after.body) ? after.body.length : 0
    expect(grew).toBe(beforeCount + 1)
    expect((after.body || []).some((c) => c.id === created.body.id)).toBeTruthy()
  })

  test('POST /api/billing/checkout returns a real Stripe checkoutUrl for a paid tier', async ({
    page,
  }) => {
    await signup(page)

    const tiers = await apiRequest<{
      data: Array<{ key?: string; prices?: Array<{ stripePriceId?: string | null }> }>
    }>(page, 'GET', '/api/billing/tiers')
    expect(tiers.status).toBe(200)
    const proPriceId = tiers.body.data?.find((tier) => tier.key === 'pro')?.prices?.[0]
      ?.stripePriceId
    expect(
      proPriceId,
      'Pro tier must have a Stripe priceId in this smoke env (run scripts/create-stripe-test-products.mjs)',
    ).toBeTruthy()

    const checkout = await apiRequest<{ checkoutUrl?: string; updated?: boolean }>(
      page,
      'POST',
      '/api/billing/checkout',
      { priceId: proPriceId },
    )
    expect(checkout.status, 'checkout must succeed').toBeLessThan(300)
    expect(
      checkout.body.checkoutUrl,
      'Stripe must return a real checkout URL — never a fake "ok" 200 with no URL',
    ).toMatch(/^https?:\/\//)
  })

  test('POST /api/billing/checkout refuses an unknown priceId (no free upgrade)', async ({
    page,
  }) => {
    await signup(page)
    const bogus = await apiRequest<{ error?: string }>(page, 'POST', '/api/billing/checkout', {
      priceId: 'price_does_not_exist',
    })
    expect(
      bogus.status,
      'unknown priceId must be rejected with 400 — silently 200ing is the free-upgrade bug',
    ).toBe(400)
    expect(bogus.body.error, 'response must include an error message').toBeTruthy()
  })

  test('POST /api/tests/:id/run runs assertions and updates last_status', async ({ page }) => {
    await signup(page)

    // First fire a request so a history row exists for the test runner to evaluate.
    const req = await apiRequest<{ id?: string }>(page, 'POST', '/api/requests', {
      name: 'test-runner-invariant',
      method: 'GET',
      url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
    })
    expect(req.status).toBeLessThan(300)
    await apiRequest(page, 'POST', `/api/requests/${req.body.id}/execute`, {})

    const created = await apiRequest<{ id?: string }>(page, 'POST', '/api/tests', {
      name: 'Invariant test',
      request_id: req.body.id,
      assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
    })
    expect(created.status).toBeLessThan(300)

    const run = await apiRequest<{ status?: string; results?: unknown[] }>(
      page,
      'POST',
      `/api/tests/${created.body.id}/run`,
      {},
    )
    expect(run.status, 'POST /api/tests/:id/run must succeed').toBeLessThan(300)
    expect(['passed', 'failed']).toContain(run.body.status)

    const list = await apiRequest<Array<{ id?: string; last_status?: string | null }>>(
      page,
      'GET',
      '/api/tests',
    )
    expect(list.status).toBe(200)
    const ours = (list.body || []).find((t) => t.id === created.body.id)
    expect(ours?.last_status, 'last_status must be persisted on the test row').toBeTruthy()
    expect(['passed', 'failed']).toContain(ours?.last_status)
  })

  test('unauthenticated /api/collections requests are rejected', async ({ page }) => {
    // Land on the public landing page first, clear the auth cookie so the
    // request goes out with no credentials, then talk to the API.
    await page.goto('/')
    await page.context().clearCookies()
    const resp = await apiRequest(page, 'GET', '/api/collections')
    expect(
      resp.status,
      'GET /api/collections must require auth — leaking unauthed reads is the multi-tenant bug',
    ).toBeGreaterThanOrEqual(400)
  })

  test('public mock token serves the configured response anonymously', async ({ page }) => {
    await signup(page)
    const { body: mock } = await apiRequest<{ id?: string; public_token?: string }>(
      page,
      'POST',
      '/api/mocks',
      {
        name: 'Public token mock',
        path_pattern: '/anything',
        method: 'GET',
        response_status: 201,
        response_body: JSON.stringify({ ok: true, mocked: 'pylon' }),
        latency_ms: 0,
        is_public: true,
      },
    )
    expect(mock.id).toBeTruthy()
    expect(mock.public_token, 'public mock must auto-mint a token').toMatch(/[a-z0-9]/i)

    // Anonymous fetch — no Authorization header. The token IS the auth.
    const anon = await page.evaluate(async (token) => {
      const r = await fetch(`/api/mock-server/${token}`)
      const text = await r.text()
      return { status: r.status, contentType: r.headers.get('content-type'), text }
    }, mock.public_token!)
    expect(anon.status, 'public mock must respond with the configured 201').toBe(201)
    expect(anon.contentType ?? '').toMatch(/json/i)
    expect(anon.text).toContain('"mocked":"pylon"')

    // Flip to private — same token must now 404.
    await apiRequest(page, 'PUT', `/api/mocks/${mock.id}`, { is_public: false })
    const blocked = await page.evaluate(async (token) => {
      const r = await fetch(`/api/mock-server/${token}`)
      return { status: r.status }
    }, mock.public_token!)
    expect(blocked.status, 'private mock must stop serving immediately when toggled off').toBe(404)
  })

  test('POST /api/monitors/:id/run executes the bound test request and records latency', async ({
    page,
  }) => {
    await signup(page)
    // request → test → monitor chain
    const { body: req } = await apiRequest<{ id?: string }>(page, 'POST', '/api/requests', {
      name: 'Monitor target',
      method: 'GET',
      url: 'https://httpbin.org/get',
    })
    expect(req.id).toBeTruthy()
    const { body: createdTest } = await apiRequest<{ id?: string }>(page, 'POST', '/api/tests', {
      name: 'Monitor-bound test',
      request_id: req.id,
      assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
    })
    expect(createdTest.id).toBeTruthy()
    const { body: monitor } = await apiRequest<{ id?: string }>(page, 'POST', '/api/monitors', {
      name: 'Reachable monitor',
      test_id: createdTest.id,
    })
    expect(monitor.id).toBeTruthy()

    const run = await apiRequest<{
      status?: string
      statusCode?: number
      durationMs?: number
      results?: Array<{ passed?: boolean }>
    }>(page, 'POST', `/api/monitors/${monitor.id}/run`, {})
    expect(run.status, 'POST /api/monitors/:id/run must succeed').toBeLessThan(300)
    expect(
      run.body.statusCode,
      'monitor must report the upstream HTTP status',
    ).toBeGreaterThanOrEqual(200)
    expect(
      run.body.durationMs,
      'duration must be a real positive number — proves the upstream call ran',
    ).toBeGreaterThan(0)
    expect(['passed', 'failed']).toContain(run.body.status)

    // Re-fetch the monitor row — last_run_at + p95_latency_ms must have
    // been written through the run handler. Past agents shipped monitors
    // with a /run endpoint that updated nothing.
    const list = await apiRequest<
      Array<{ id?: string; last_run_at?: string | null; p95_latency_ms?: number | null }>
    >(page, 'GET', '/api/monitors')
    const ours = (list.body || []).find((m) => m.id === monitor.id)
    expect(ours?.last_run_at, 'last_run_at must be persisted on the monitor row').toBeTruthy()
    expect(typeof ours?.p95_latency_ms, 'p95_latency_ms must be a number').toBe('number')
  })
})
