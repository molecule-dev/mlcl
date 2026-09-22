import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

test.describe('/rules', () => {
  test('renders empty state on a fresh account — fetches rules + templates in parallel', async ({
    page,
  }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      // Arm BOTH response waits BEFORE goto — the GETs can resolve before the
      // awaiters subscribe, causing a 15s timeout. 30s absorbs the API being
      // busy with in-flight AI upload calls from earlier tests.
      const rulesResponse = page.waitForResponse(
        (r) => /\/api\/extraction-rules(?:\?|$)/.test(r.url()) && r.status() === 200,
        { timeout: 30_000 },
      )
      const templatesResponse = page.waitForResponse(
        (r) => /\/api\/extraction-templates(?:\?|$)/.test(r.url()) && r.status() === 200,
        { timeout: 30_000 },
      )
      await page.goto(APP_BASE + '/rules')
      await Promise.all([rulesResponse, templatesResponse])
    })
    const rulesGet = reqs.find(
      (r) => r.method === 'GET' && /\/api\/extraction-rules(?:\?|$)/.test(r.url),
    )
    const tplGet = reqs.find(
      (r) => r.method === 'GET' && /\/api\/extraction-templates(?:\?|$)/.test(r.url),
    )
    expect(rulesGet, 'GET /api/extraction-rules must fire').toBeDefined()
    expect(tplGet, 'GET /api/extraction-templates must fire').toBeDefined()
    await expect(page.locator('[data-mol-id="rules-page"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="rules-empty"]')).toBeVisible()
  })

  test('"New rule" button reveals form, submits, persists, and reflects in API', async ({
    page,
  }) => {
    await signup(page)
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await page.locator('[data-mol-id="rules-new"]').click()
    await expect(page.locator('[data-mol-id="rules-new-form"]')).toBeVisible()

    const ruleName = `e2e-${Date.now()}`
    await page.locator('[data-mol-id="rules-form-name"]').fill(ruleName)
    await page.locator('[data-mol-id="rules-form-type"]').selectOption('invoice')
    await page.locator('[data-mol-id="rules-form-destination"]').fill('/Inbox/Invoices')

    const reqs = await captureNetwork(page, async () => {
      // Set up the response promise BEFORE clicking so we never miss a
      // fast response that completes between click and listener.
      const respPromise = page.waitForResponse(
        (r) => r.request().method() === 'POST' && /\/api\/extraction-rules$/.test(r.url()),
        { timeout: 15_000 },
      )
      await page.locator('[data-mol-id="rules-form-submit"]').click()
      const resp = await respPromise
      expect(resp.status()).toBeLessThan(400)
    })
    const post = reqs.find((r) => r.method === 'POST' && /\/api\/extraction-rules$/.test(r.url))
    expect(post).toBeDefined()
    expect(post!.status, 'POST /api/extraction-rules must succeed').toBeLessThan(400)

    // The rule card should now be visible and the empty placeholder gone.
    await expect(page.getByText(ruleName)).toBeVisible({ timeout: 10_000 })
    await expect(page.locator('[data-mol-id="rules-empty"]')).toHaveCount(0)

    // Read-after-write: backend list must include the rule.
    const token = await getAccessToken(page)
    const list = await page.request.get(API_BASE + '/extraction-rules', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = (await list.json()) as Array<{
      name: string
      matchedType: string
      destination: string
    }>
    const created = items.find((r) => r.name === ruleName)
    expect(created, 'rule should be in the API list').toBeDefined()
    expect(created!.matchedType).toBe('invoice')
    expect(created!.destination).toBe('/Inbox/Invoices')
  })

  test('rules page region is rendered after data loads', async ({ page }) => {
    await signup(page)
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await expect(page.locator('[data-mol-id="rules-page"]')).toBeVisible()
  })

  test('"New rule" button toggles the inline form open and closed', async ({ page }) => {
    await signup(page)
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await page.locator('[data-mol-id="rules-new"]').click()
    await expect(page.locator('[data-mol-id="rules-new-form"]')).toBeVisible()
    await page.locator('[data-mol-id="rules-new"]').click()
    await expect(page.locator('[data-mol-id="rules-new-form"]')).toHaveCount(0)
  })

  test('Rule name input accepts typed input', async ({ page }) => {
    await signup(page)
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await page.locator('[data-mol-id="rules-new"]').click()
    await page.locator('[data-mol-id="rules-form-name"]').fill('Vendor invoices')
    await expect(page.locator('[data-mol-id="rules-form-name"]')).toHaveValue('Vendor invoices')
  })

  test('Document type select changes value', async ({ page }) => {
    await signup(page)
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await page.locator('[data-mol-id="rules-new"]').click()
    await page.locator('[data-mol-id="rules-form-type"]').selectOption('receipt')
    await expect(page.locator('[data-mol-id="rules-form-type"]')).toHaveValue('receipt')
  })

  test('Destination field accepts typed input', async ({ page }) => {
    await signup(page)
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await page.locator('[data-mol-id="rules-new"]').click()
    await page.locator('[data-mol-id="rules-form-destination"]').fill('/Inbox/Receipts')
    await expect(page.locator('[data-mol-id="rules-form-destination"]')).toHaveValue(
      '/Inbox/Receipts',
    )
  })

  test('Created rule card is visible and not the empty-state placeholder', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    await page.request.post(API_BASE + '/extraction-rules', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `card-${Date.now()}`, matchedType: 'receipt', destination: '/Inbox/Receipts' },
    })
    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    await expect(page.locator('[data-mol-id="rules-empty"]')).toHaveCount(0)
    await expect(page.locator('[data-mol-id^="rule-"]').first()).toBeVisible({ timeout: 10_000 })
  })

  test('toggling a rule sends PATCH /api/extraction-rules/:id and persists', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    // Seed a rule directly via API so the test isn't gated by the form path.
    const seed = await page.request.post(API_BASE + '/extraction-rules', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: `toggle-${Date.now()}`, matchedType: 'invoice', destination: '/Toggle' },
    })
    expect(seed.status()).toBeLessThan(400)
    const seeded = (await seed.json()) as { id: string }

    // Arm the response wait BEFORE goto — the /api/extraction-rules fetch can
    // resolve before the awaiter subscribes, causing a 15s timeout.
    const rulesResponse = page.waitForResponse(
      (r) => /\/api\/extraction-rules/.test(r.url()) && r.status() === 200,
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/rules')
    await rulesResponse
    // Wait for the seeded rule's card to actually render before we try to
    // click into it — the GET response fires before React reconciles.
    await page
      .locator(`[data-mol-id="rule-${seeded.id}"]`)
      .waitFor({ state: 'attached', timeout: 10_000 })

    const reqs = await captureNetwork(page, async () => {
      const respPromise = page.waitForResponse(
        (r) =>
          r.request().method() === 'PATCH' &&
          new RegExp(`/api/extraction-rules/${seeded.id}$`).test(r.url()),
        { timeout: 10_000 },
      )
      // The checkbox is sr-only inside a styled <label>; clicking the
      // wrapping label fires the input's onChange exactly like a real user
      // tapping the visible switch.
      const toggleId = `rule-${seeded.id}-toggle`
      await page.evaluate((id) => {
        const input = document.querySelector(`[data-mol-id="${id}"]`) as HTMLInputElement | null
        if (!input) throw new Error('toggle input not found')
        const label = input.closest('label') as HTMLLabelElement | null
        if (label) label.click()
        else input.click()
      }, toggleId)
      const resp = await respPromise
      expect(resp.status()).toBeLessThan(400)
    })
    const patch = reqs.find(
      (r) => r.method === 'PATCH' && new RegExp(`/api/extraction-rules/${seeded.id}$`).test(r.url),
    )
    expect(patch, 'PATCH should fire').toBeDefined()
    expect(patch!.status).toBeLessThan(400)

    // Read-after-write
    const after = await page.request.get(API_BASE + '/extraction-rules', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const items = (await after.json()) as Array<{ id: string; enabled: boolean }>
    const updated = items.find((r) => r.id === seeded.id)
    expect(updated).toBeDefined()
    expect(updated!.enabled, 'rule should now be paused').toBe(false)
  })
})
