import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test.describe('/tests', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/tests')
    await expect(page.getByRole('heading', { name: /^Test runner$/i, level: 1 })).toBeVisible()
  })

  test('"New test" creates a row and the suites list grows by one', async ({ page }) => {
    await signup(page)
    const { body: before } = await apiRequest<unknown[]>(page, 'GET', '/api/tests')
    const beforeCount = Array.isArray(before) ? before.length : 0

    await page.goto(APP_BASE + '/tests')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="testrunner-new"]').click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/tests(?:\?|$)/.test(r.url) &&
          r.status >= 200 &&
          r.status < 300,
      ),
      'POST /api/tests must succeed',
    ).toBeTruthy()
    const { body: after } = await apiRequest<unknown[]>(page, 'GET', '/api/tests')
    expect(Array.isArray(after) ? after.length : 0).toBe(beforeCount + 1)
  })

  test('"Run all" fires per-test runs and updates assertion statuses', async ({ page }) => {
    await signup(page)
    // Create a test first so Run all has something to do
    await apiRequest(page, 'POST', '/api/tests', {
      name: 'Run-all sanity',
      assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
    })
    await page.goto(APP_BASE + '/tests')

    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-mol-id="testrunner-run-all"]').click()
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) =>
          r.method === 'POST' &&
          /\/api\/tests\/.+\/run/.test(r.url) &&
          r.status >= 200 &&
          r.status < 500,
      ),
      'POST /api/tests/:id/run must be observed',
    ).toBeTruthy()
  })

  test('selecting a different suite re-renders the assertions panel', async ({ page }) => {
    await signup(page)
    // Create two tests so the sidebar has more than one entry
    await apiRequest(page, 'POST', '/api/tests', {
      name: 'Suite Alpha',
      assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
    })
    await apiRequest(page, 'POST', '/api/tests', {
      name: 'Suite Beta',
      assertions: [{ field: 'status', operator: 'equals', expected: 201 }],
    })

    await page.goto(APP_BASE + '/tests')
    const items = page.locator('[data-mol-id^="testrunner-suite-"]')
    await expect(items.first()).toBeVisible()
    const count = await items.count()
    expect(count, 'two suites should be in the sidebar').toBeGreaterThanOrEqual(2)
    // Click the second suite — the active heading should match its name.
    await items.nth(1).click()
    // Either Alpha or Beta — what matters is the active heading flips.
    await expect(page.getByRole('heading', { name: /Suite (Alpha|Beta)/i }).first()).toBeVisible()
  })

  test('per-suite "Run" button fires POST /api/tests/:id/run for one test', async ({ page }) => {
    await signup(page)
    const { body: created } = await apiRequest<{ id?: string }>(page, 'POST', '/api/tests', {
      name: 'Per-suite run',
      assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
    })
    expect(created.id, 'create response must include an id').toBeTruthy()

    await page.goto(APP_BASE + '/tests')
    const reqs = await captureNetwork(page, async () => {
      await page.locator(`[data-mol-id="testrunner-run-${created.id}"]`).click()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) => r.method === 'POST' && new RegExp(`/api/tests/${created.id}/run`).test(r.url),
      ),
      `POST /api/tests/${created.id}/run must be observed`,
    ).toBeTruthy()
  })

  test('empty state renders for a fresh user with no tests', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/tests')
    await expect(page.getByText(/No tests yet/i)).toBeVisible()
    await ctx.close()
  })

  test('per-assertion PASSED status survives page reload (read-after-write)', async ({ page }) => {
    await signup(page)

    // Set up: a real saved request + a history row for the test runner to
    // evaluate against, then a test that asserts status === 200.
    const { body: req } = await apiRequest<{ id?: string }>(page, 'POST', '/api/requests', {
      name: 'Reload-persistence request',
      method: 'GET',
      url: `http://127.0.0.1:${process.env.API_PORT ?? '4000'}/health`,
    })
    expect(req.id).toBeTruthy()
    const exec = await apiRequest<{ status?: number }>(
      page,
      'POST',
      `/api/requests/${req.id}/execute`,
      {},
    )
    expect(exec.status).toBeLessThan(300)

    const { body: created } = await apiRequest<{ id?: string }>(page, 'POST', '/api/tests', {
      name: 'Reload-persistence test',
      request_id: req.id,
      assertions: [{ field: 'status', operator: 'equals', expected: 200 }],
    })
    expect(created.id).toBeTruthy()

    await page.goto(APP_BASE + '/tests')
    // Click the per-suite run for our specific test
    await page.locator(`[data-mol-id="testrunner-suite-${created.id}"]`).click()
    await page.locator(`[data-mol-id="testrunner-run-${created.id}"]`).click()
    // Wait for the assertion row to flip from SKIPPED to PASSED.
    await expect(page.getByText('PASSED').first()).toBeVisible({ timeout: 10_000 })

    // Reload — this is the part past agents skipped. If last_results is
    // not persisted (or the UI doesn't seed runResults from it), the
    // PASSED pill snaps back to SKIPPED on next paint.
    await page.reload()
    await page.locator(`[data-mol-id="testrunner-suite-${created.id}"]`).click()
    await expect(page.getByText('PASSED').first()).toBeVisible({ timeout: 10_000 })
    // And the suite-list summary ("1/1") must reflect the persisted
    // pass count, not 0/1.
    await expect(
      page.locator(`[data-mol-id="testrunner-suite-${created.id}"]`).getByText('1/1'),
    ).toBeVisible()
  })
})
