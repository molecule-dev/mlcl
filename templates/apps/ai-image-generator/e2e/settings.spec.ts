import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/settings', () => {
  test('renders Settings h1 and fetches plans/profile', async ({ page }) => {
    await signup(page)
    // The page's data fetch fires from a mount effect — after the headings are
    // already visible — so the capture must stay attached until the network
    // settles (networkidle), not just until the first heading renders.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /^Settings$/i, level: 1 })).toBeVisible()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    const calledPlans = reqs.some((r) => /\/api\/plans/.test(r.url) && r.method === 'GET')
    const calledProfile = reqs.some((r) => /\/api\/profile/.test(r.url) && r.method === 'GET')
    expect(calledPlans || calledProfile).toBeTruthy()
  })

  test('renders Plan & credits section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /Plan & credits/i, level: 2 })).toBeVisible()
  })

  test('"Switch to Creator" hands the user off to a real Stripe Checkout (no free upgrades)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.getByRole('button', { name: /Switch to Creator/i })
    await expect(btn).toBeEnabled()

    // Capture the API request URL so we can prove the backend issued a real
    // Stripe checkout session (rather than free-upgrading the planKey in the
    // database). page.waitForRequest fires when the *request* leaves the
    // browser — independent of whether the upstream response body races a
    // navigation away from the settings page.
    const stripeNav = page.waitForRequest(
      (r) => /^https:\/\/checkout\.stripe\.com\//.test(r.url()),
      { timeout: 15_000 },
    )
    const switchReq = page.waitForRequest(
      (r) => /\/api\/plans\/switch/.test(r.url()) && r.method() === 'POST',
      { timeout: 15_000 },
    )

    await btn.click()
    const apiReq = await switchReq
    const stripeReq = await stripeNav

    expect(apiReq.postDataJSON()?.planKey, 'plan switch payload must target a paid plan').toBe(
      'creator',
    )
    expect(stripeReq.url(), 'frontend must hand off to a real Stripe Checkout session URL').toMatch(
      /^https:\/\/checkout\.stripe\.com\/[a-z]\/[a-z_]+\/cs_/,
    )
  })

  test('"Switch to Studio" hands the user off to a real Stripe Checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const btn = page.getByRole('button', { name: /Switch to Studio/i })
    await expect(btn).toBeEnabled()

    const stripeNav = page.waitForRequest(
      (r) => /^https:\/\/checkout\.stripe\.com\//.test(r.url()),
      { timeout: 15_000 },
    )
    await btn.click()
    const stripeReq = await stripeNav
    expect(stripeReq.url()).toMatch(/^https:\/\/checkout\.stripe\.com\/[a-z]\/[a-z_]+\/cs_/)
  })

  test('renders API keys section and fetches /api/api-keys', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/settings')
      await expect(page.getByRole('heading', { name: /API keys/i, level: 2 })).toBeVisible()
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/api-keys/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('renders Creator profile section', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.getByRole('heading', { name: /Creator profile/i, level: 2 })).toBeVisible()
  })

  test('Bio textbox accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    // The Bio textarea sits inside an implicit <label><span>Bio</span><textarea/></label>;
    // Playwright's `getByLabel` doesn't always match implicit labels with sibling
    // spans, so target the textbox by its accessible name instead.
    const tb = page.getByRole('textbox', { name: /^Bio$/i })
    await tb.fill('I dream in pixels.')
    await expect(tb).toHaveValue('I dream in pixels.')
  })

  test('"Save profile" persists Bio across reload', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    const bio = page.getByRole('textbox', { name: /^Bio$/i })
    const value = `persisted bio ${Date.now()}`
    await bio.fill(value)

    const profileSave = page.waitForResponse(
      (r) =>
        /\/api\/profile/.test(r.url()) &&
        (r.request().method() === 'PUT' || r.request().method() === 'POST'),
      { timeout: 10_000 },
    )
    await page.getByRole('button', { name: /Save profile/i }).click()
    const resp = await profileSave
    expect(resp.status(), 'profile save must return 2xx').toBeLessThan(300)

    await page.reload()
    await expect(
      page.getByRole('textbox', { name: /^Bio$/i }),
      'Bio must round-trip through the database',
    ).toHaveValue(value, { timeout: 10_000 })
  })
})
