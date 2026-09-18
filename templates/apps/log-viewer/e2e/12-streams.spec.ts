import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /streams — list seeded streams + create new stream (POST /api/streams).

test.describe('/streams', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/streams')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('after signup, /streams loads via GET /api/streams and shows ≥1 row', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/streams')
      await page.waitForResponse((r) => /\/api\/streams(\b|\?|$)/.test(r.url()), {
        timeout: 10_000,
      })
    })
    const req = reqs.find((r) => r.method === 'GET' && /\/api\/streams(\b|\?|$)/.test(r.url))
    expect(req, 'GET /api/streams should fire').toBeDefined()
    expect(req!.status).toBeLessThan(300)
    await expect(page.locator('main ul li, main a[href^="/streams/"]').first()).toBeVisible({
      timeout: 5_000,
    })
  })

  test('"+ New stream" opens the create dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/streams')
    await page.waitForResponse((r) => /\/api\/streams/.test(r.url()))
    await page.locator('[data-mol-id="streams-new"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('creating a new stream POSTs /api/streams and the row appears + persists across reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/streams')
    await page.waitForResponse((r) => /\/api\/streams/.test(r.url()))
    const name = `walker-stream-${Date.now()}`
    await page.locator('[data-mol-id="streams-new"]').click()
    await page.locator('#streams-new-name').fill(name)
    await page.locator('#streams-new-source').fill('webhook://test')
    const respPromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/api\/streams/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="streams-create-submit"]').click()
    const resp = await respPromise
    expect(resp.status(), 'POST /api/streams should succeed').toBeLessThan(300)
    // Read-after-write via the API directly (proves DB persistence).
    const token = await getAccessToken(page)
    const res = await page.request.get(API_BASE + '/streams', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json().catch(() => ({}))
    const items: Array<{ name: string }> = Array.isArray(body)
      ? body
      : Array.isArray(body.data)
        ? body.data
        : Array.isArray(body.results)
          ? body.results
          : []
    expect(
      items.find((s) => s.name === name),
      'new stream persists in DB',
    ).toBeDefined()
    // UI reload shows the new row.
    await page.reload()
    await page.waitForResponse((r) => /\/api\/streams/.test(r.url()))
    await expect(page.getByText(name)).toBeVisible({ timeout: 5_000 })
  })

  test('clicking a stream card navigates to /streams/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/streams')
    await page.waitForResponse((r) => /\/api\/streams/.test(r.url()))
    const card = page.locator('a[href^="/streams/"]').first()
    if ((await card.count()) === 0) test.skip(true, 'no streams seeded')
    await card.click()
    await expect(page).toHaveURL(/\/streams\/[^/]+/)
  })

  test('cancel button closes the create dialog', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/streams')
    await page.waitForResponse((r) => /\/api\/streams/.test(r.url()))
    await page.locator('[data-mol-id="streams-new"]').click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })
})
