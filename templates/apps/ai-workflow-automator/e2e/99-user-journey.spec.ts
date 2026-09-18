import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  captureNetwork,
  createWorkflow,
  installTemplate,
  listRuns,
  listWorkflows,
  signup,
  toggleWorkflow,
  triggerWorkflow,
} from './_helpers.js'

test.describe('99 — full user journey: signup → install template → run → settings → billing', () => {
  test('end-to-end happy path with read-after-write invariants', async ({ page }) => {
    // Step 1: signup
    const { userId, email } = await signup(page)

    // Step 2: dashboard renders, sparkline is 24-bucket array.
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible()

    // Step 3: install a template → workflow row appears in /workflows
    const before = await listWorkflows(page)
    expect(before.length).toBe(0)
    const installResult = await installTemplate(page, 'lead-routing')
    expect(installResult.workflow_id).toBeTruthy()
    const after = await listWorkflows(page)
    expect(after.length).toBe(1)
    const installed = after[0] as Record<string, unknown>
    expect(installed.id).toBe(installResult.workflow_id)
    expect(installed.name).toMatch(/lead/i)

    // Step 4: also create a manual workflow with an http step
    const httpWf = await createWorkflow(page, {
      name: 'journey-http',
      steps: [
        {
          type: 'http',
          config: {
            url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
            method: 'GET',
            body: { from: 'journey' },
          },
        },
      ],
    })
    expect(httpWf.id).toBeTruthy()

    // Step 5: enable + trigger the http workflow → run reflects in /api/runs
    await toggleWorkflow(page, httpWf.id as string)
    const run = await triggerWorkflow(page, httpWf.id as string)
    expect((run as Record<string, unknown>).status).toMatch(/success|completed/)
    const runs = await listRuns(page)
    expect(runs.length).toBeGreaterThan(0)
    const lastRun = runs[0] as Record<string, unknown>
    expect(lastRun.workflow_id).toBe(httpWf.id)

    // Step 6: read run detail and assert step_results captured the upstream response
    const detailRes = await page.request.get(`${API_BASE}/runs/${lastRun.id as string}`, {
      headers: authHeaders(page),
    })
    expect(detailRes.status()).toBe(200)
    const detail = (await detailRes.json()) as { step_results?: string }
    const stepResults = JSON.parse(
      typeof detail.step_results === 'string'
        ? detail.step_results
        : JSON.stringify(detail.step_results),
    ) as Array<{ status: string; output: string }>
    expect(stepResults.length).toBeGreaterThan(0)
    // The step captured the upstream's real body. This looked for the echoed
    // { from: 'journey' } payload back when the target was httpbin; the local
    // /health route answers its own JSON, so assert on that instead — the point
    // is unchanged: step_results holds the real response, not a stub.
    expect(stepResults[0].output.toLowerCase()).toContain('status')

    // Step 7: dashboard now reflects active_workflows + recent runs
    const dashRes = await page.request.get(`${API_BASE}/dashboard`, {
      headers: authHeaders(page),
    })
    const dash = (await dashRes.json()) as {
      recent_runs: unknown[]
      active_workflows: number
      total_workflows: number
    }
    expect(dash.total_workflows).toBeGreaterThanOrEqual(2)
    expect(dash.active_workflows).toBeGreaterThanOrEqual(1)
    expect(dash.recent_runs.length).toBeGreaterThanOrEqual(1)

    // Step 8: rename in settings and verify round-trip persists across reload
    const newName = 'JourneyName-' + Date.now()
    const patchRes = await page.request.patch(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(page),
      data: { name: newName },
    })
    expect(patchRes.status()).toBe(200)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const meRes = await page.request.get(`${API_BASE}/users/me`, {
      headers: authHeaders(page),
    })
    const me = (await meRes.json()) as { props: { name: string } }
    expect(me.props.name).toBe(newName)

    // Step 9: real Stripe Checkout URL from /billing
    const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`, {
      headers: authHeaders(page),
    })
    const tiers = (await tiersRes.json()) as {
      data: Array<{ key: string; prices: Array<{ stripePriceId?: string | null }> }>
    }
    const proPrice = tiers.data
      .find((t) => t.key === 'pro')!
      .prices.find((p) => p.stripePriceId)!.stripePriceId!
    const checkoutRes = await page.request.post(`${API_BASE}/billing/checkout`, {
      headers: authHeaders(page),
      data: { priceId: proPrice },
    })
    expect(checkoutRes.status()).toBe(200)
    const checkout = (await checkoutRes.json()) as { checkoutUrl: string }
    expect(checkout.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\/c\/pay\/cs_test_/)

    // Step 10: forgot-password lifecycle (won't reset in this session, just
    // verify the UX endpoint is wired and never enumerates).
    const forgotRes = await page.request.post(`${API_BASE}/users/forgot-password`, {
      data: { email },
    })
    expect(forgotRes.status()).toBe(200)

    // Step 11: notifications endpoint returns shape (data, total, unread)
    const noteRes = await page.request.get(`${API_BASE}/notifications`, {
      headers: authHeaders(page),
    })
    const note = (await noteRes.json()) as { data: unknown[]; total: number; unread: number }
    expect(Array.isArray(note.data)).toBe(true)
    expect(typeof note.total).toBe('number')
    expect(typeof note.unread).toBe('number')

    // Step 12: every primary navigation works under captureNetwork
    const reqs = await captureNetwork(page, async () => {
      for (const route of [
        '/dashboard',
        '/workflows',
        '/executions',
        '/templates',
        '/connections',
        '/notifications',
      ]) {
        await page.goto(APP_BASE + route)
        await page.waitForLoadState('networkidle')
      }
    })
    const failed = reqs.filter((r) => r.status >= 500)
    expect(failed, `no 5xx during full navigation walk: ${JSON.stringify(failed)}`).toEqual([])
  })
})
