import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, asList, captureNetwork, signup } from './_helpers.js'

test.describe('/webhooks', () => {
  test('renders endpoints + recent deliveries seeded for the new user', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/webhooks')
      await expect(page.getByRole('heading', { name: /^Webhooks$/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /^Endpoints$/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /^Recent deliveries$/i })).toBeVisible()
    })
    const wReq = reqs.find((r) => r.method === 'GET' && /\/api\/webhooks(\?|$)/.test(r.url))
    expect(wReq, 'mount must fetch /api/webhooks').toBeTruthy()
    expect(wReq?.status).toBe(200)
    const eReq = reqs.find((r) => r.method === 'GET' && /\/api\/webhook-events(\?|$)/.test(r.url))
    expect(eReq, 'mount must fetch /api/webhook-events').toBeTruthy()
    expect(eReq?.status).toBe(200)
    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/webhooks')
    const list = asList(body)
    expect(list.length).toBeGreaterThan(0)
  })

  test('"+ New endpoint" creates a webhook + persists across reload + shows secret once', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/webhooks')
    const url = `https://example.com/test-${Date.now()}`
    await page.locator('[data-mol-id="button-new-endpoint"]').click()
    await page.locator('[data-mol-id="input-url"]').fill(url)
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.locator('[data-mol-id="dialog-new-endpoint"]')).toBeHidden({
      timeout: 10_000,
    })
    await expect(page.locator('[data-mol-id="webhook-secret"]')).toBeVisible()

    const { body } = await apiRequest<{ data?: any[] }>(page, 'GET', '/api/webhooks')
    expect(asList(body).find((w: any) => w.url === url)).toBeTruthy()

    await page.reload()
    await expect(page.getByText(url).first()).toBeVisible({ timeout: 10_000 })
  })

  test('non-http URL surfaces a validation error and does not POST', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/webhooks')
    const before = asList((await apiRequest<unknown>(page, 'GET', '/api/webhooks')).body)
    await page.locator('[data-mol-id="button-new-endpoint"]').click()
    // ftp:// passes the browser <input type=url> filter but should fail the
    // app's `must start with http(s)://` runtime check.
    await page.locator('[data-mol-id="input-url"]').fill('ftp://example.com/webhook')
    await page.locator('[data-mol-id="button-submit"]').click()
    await expect(page.getByText(/must start with http/i)).toBeVisible()
    const after = asList((await apiRequest<unknown>(page, 'GET', '/api/webhooks')).body)
    expect(after.length).toBe(before.length)
  })

  test('selecting an endpoint filters the deliveries list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/webhooks')
    const firstEndpoint = page
      .locator('button[type="button"]')
      .filter({ has: page.locator('code') })
      .first()
    // isVisible() is an immediate read that never waits, called right after goto()
    // — so it saw the pre-paint DOM and skipped instead of exercising the endpoint.
    const present = await firstEndpoint
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) test.skip(true, 'No endpoints to select')
    await firstEndpoint.click()
    await expect(page.getByRole('button', { name: /Show all endpoints/i })).toBeVisible()
  })
})
