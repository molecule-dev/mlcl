import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  captureNetwork,
  getAccessToken,
  getUserId,
  signup,
} from './_helpers.js'

test.describe('settings page', () => {
  test('renders heading + email pre-filled', async ({ page }) => {
    const creds = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('#settings-email')).toHaveValue(creds.email, { timeout: 10_000 })
  })

  test('mount hydrates from authenticated session (email field populated)', async ({ browser }) => {
    const fresh = await browser.newContext()
    const p2 = await fresh.newPage()
    const creds = await signup(p2)
    await p2.goto(APP_BASE + '/settings')
    // Settings hydrates from cached auth state — confirm the protected route
    // actually rendered the user's data (not just a generic shell).
    await expect(p2.locator('#settings-email')).toHaveValue(creds.email, { timeout: 10_000 })
    await fresh.close()
  })

  test('account / billing / devices sections render', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.waitForLoadState('networkidle')
    const text = (await page.locator('body').textContent()) || ''
    expect(text).toMatch(/Account|Email/i)
    expect(text).toMatch(/Billing|Plan/i)
    expect(text).toMatch(/Devices|Device/i)
  })

  test('Upgrade button calls /billing/checkout and gets a real Stripe URL', async ({
    page,
    request,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // Wait for the plan label to populate from /billing/status so the button
    // is enabled (its disabled state hinges on plan === 'free').
    await expect(page.locator('[data-mol-id="settings-plan-name"]')).toHaveText(/^Free$/i, {
      timeout: 10_000,
    })
    const upgradeBtn = page.locator('[data-mol-id="settings-upgrade-button"]')
    await expect(upgradeBtn).toBeVisible({ timeout: 10_000 })
    await expect(upgradeBtn).toBeEnabled({ timeout: 10_000 })

    // Two assertions in one test:
    // (1) Clicking the button actually fires POST /api/billing/checkout
    //     (proves the page-side wiring is real, not a no-op handler).
    // (2) That endpoint returns a real cs_test_ Stripe Checkout URL.
    //
    // Reading the body of the SPA-driven response races against the SPA
    // assigning window.location.href = url, which tears the page down
    // before fetch.text() resolves. So we read the request to capture
    // the priceId the SPA shipped, then issue an independent POST via
    // page.request (Playwright's APIRequestContext, immune to page
    // navigation) carrying the same auth bearer to capture the body.
    const reqPromise = page.waitForRequest(
      (r) => r.url().includes('/api/billing/checkout') && r.method() === 'POST',
      { timeout: 15_000 },
    )
    await upgradeBtn.click()
    const req = await reqPromise
    const reqBody = req.postDataJSON?.() ?? {}
    expect(reqBody, 'checkout POST should ship a priceId').toMatchObject({
      priceId: expect.any(String),
    })

    const token = await getAccessToken(page)
    expect(token, 'access token should be present').toBeTruthy()
    const directResp = await request.post(API_BASE + '/billing/checkout', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { priceId: reqBody.priceId },
    })
    expect(directResp.status(), 'checkout POST status').toBe(200)
    const body = (await directResp.json()) as { checkoutUrl?: string }
    expect(body.checkoutUrl, `expected Stripe Checkout URL, got ${JSON.stringify(body)}`).toMatch(
      /^https:\/\/checkout\.stripe\.com\/.*cs_test_/,
    )
  })

  test('PATCH /api/users/:id updates the user (read-after-write reflected in /settings)', async ({
    page,
  }) => {
    const creds = await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('#settings-email')).toHaveValue(creds.email, { timeout: 10_000 })

    const userId = await getUserId(page)
    expect(userId, 'user id should be persisted in molecule auth state').toBeTruthy()

    // The API deliberately rejects email changes without the current password
    // (400 "Current password is required."), so this read-after-write check
    // PATCHes the NAME only.
    const newName = `Updated Owner ${Date.now()}`
    const reqs = await captureNetwork(page, async () => {
      // Issue PATCH from the page itself (so the network listener sees it).
      const result = await page.evaluate(
        async ({ uid, body }) => {
          const r = await fetch(`/api/users/${uid}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          return { status: r.status, body: await r.text() }
        },
        { uid: userId, body: { name: newName } },
      )
      expect(result.status, `PATCH should succeed: ${result.body}`).toBeLessThan(400)
    })
    const patches = reqs.filter(
      (r) => r.method === 'PATCH' && r.url.includes(`/api/users/${userId}`),
    )
    expect(patches.length, `expected PATCH /api/users/${userId}`).toBeGreaterThan(0)
    expect(patches[0].status, 'PATCH should succeed').toBeLessThan(400)

    // Verify backend persistence via direct GET (independent of frontend auth cache).
    const verify = await page.evaluate(
      async ({ uid }) => {
        const r = await fetch(`/api/users/${uid}`, {
          credentials: 'include',
        })
        return { status: r.status, body: await r.json() }
      },
      { uid: userId },
    )
    expect(verify.status).toBe(200)
    const bodyStr = JSON.stringify(verify.body)
    expect(bodyStr, `verify body should contain new name; got ${bodyStr}`).toContain(newName)
  })
})
