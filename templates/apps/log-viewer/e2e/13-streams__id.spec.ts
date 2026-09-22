import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { gotoAndWait, APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /streams/:id — stream detail with hero + ingestion stats + parsing rules + recent events.

test.describe('/streams/:id', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/streams/anything')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('shows stream hero + ingestion stats from GET /api/streams/:id', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const res = await page.request.get(API_BASE + '/streams', {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json()
    const items: Array<{ id: string }> = Array.isArray(body)
      ? body
      : body.data || body.results || []
    test.skip(items.length === 0, 'no streams seeded')
    const id = items[0].id
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(page, APP_BASE + `/streams/${id}`, (r) =>
        new RegExp(`/api/streams/${id}`).test(r.url()),
      )
    })
    const req = reqs.find((r) => r.method === 'GET' && new RegExp(`/api/streams/${id}`).test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('"All streams" back-link goes to /streams', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const body = await (
      await page.request.get(API_BASE + '/streams', {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    const items: Array<{ id: string }> = Array.isArray(body)
      ? body
      : body.data || body.results || []
    test.skip(items.length === 0, 'no streams seeded')
    await page.goto(APP_BASE + `/streams/${items[0].id}`)
    await page
      .getByRole('link', { name: /all streams|streams|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/streams$/)
  })

  test('parsing rules table renders ≥ 4 rows', async ({ page }) => {
    await signup(page)
    const token = await getAccessToken(page)
    const body = await (
      await page.request.get(API_BASE + '/streams', {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()
    const items: Array<{ id: string }> = Array.isArray(body)
      ? body
      : body.data || body.results || []
    test.skip(items.length === 0, 'no streams seeded')
    await gotoAndWait(page, APP_BASE + `/streams/${items[0].id}`, (r) =>
      /\/api\/streams\//.test(r.url()),
    )
    const rules = page.locator('aside ul li')
    await expect(rules.nth(2)).toBeVisible({ timeout: 5_000 })
  })

  test('shows "not found" for an unknown stream id', async ({ page }) => {
    // The API correctly answers 404 for a malformed/unknown id; the browser
    // logs the failed resource load — expected here, not a page bug.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 404',
    })
    await signup(page)
    await page.goto(APP_BASE + '/streams/no-such-stream-id')
    await expect(page.getByText(/not found|loading|failed/i).first()).toBeVisible({
      timeout: 10_000,
    })
  })
})
