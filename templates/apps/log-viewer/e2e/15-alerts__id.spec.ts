import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { gotoAndWait, APP_BASE, API_BASE, captureNetwork, getAccessToken, signup } from './_helpers'

// /alerts/:id — alert detail with condition, fire history, runbook, channels.

async function firstAlertId(page: import('@playwright/test').Page): Promise<string | null> {
  const token = await getAccessToken(page)
  const res = await page.request.get(API_BASE + '/alerts', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  const items: Array<{ id: string }> = Array.isArray(body) ? body : body.data || body.results || []
  return items[0]?.id ?? null
}

test.describe('/alerts/:id', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/alerts/anything')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('shows alert hero + condition from GET /api/alerts/:id', async ({ page }) => {
    await signup(page)
    const id = await firstAlertId(page)
    test.skip(!id, 'no alerts seeded')
    const reqs = await captureNetwork(page, async () => {
      await gotoAndWait(page, APP_BASE + `/alerts/${id}`, (r) =>
        new RegExp(`/api/alerts/${id}`).test(r.url()),
      )
    })
    const req = reqs.find((r) => r.method === 'GET' && new RegExp(`/api/alerts/${id}`).test(r.url))
    expect(req).toBeDefined()
    expect(req!.status).toBeLessThan(300)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('"All alerts" back-link goes to /alerts', async ({ page }) => {
    await signup(page)
    const id = await firstAlertId(page)
    test.skip(!id, 'no alerts seeded')
    await page.goto(APP_BASE + `/alerts/${id}`)
    await page
      .getByRole('link', { name: /all alerts|alerts|back/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/alerts$/)
  })

  test('"Silence 1h" POSTs /api/alerts/:id/silence and shows confirmation', async ({ page }) => {
    await signup(page)
    const id = await firstAlertId(page)
    test.skip(!id, 'no alerts seeded')
    await gotoAndWait(page, APP_BASE + `/alerts/${id}`, (r) =>
      new RegExp(`/api/alerts/${id}`).test(r.url()),
    )
    const silencePromise = page.waitForResponse(
      (r) => r.request().method() === 'POST' && /\/silence$/.test(r.url()),
      { timeout: 10_000 },
    )
    await page.locator('[data-mol-id="alert-silence"]').click()
    const silenceResp = await silencePromise
    expect(silenceResp.status()).toBeLessThan(300)
    await expect(page.locator('[data-mol-id="alert-silence-msg"]')).toBeVisible({
      timeout: 5_000,
    })
  })

  test('"Declare incident" navigates to /incidents', async ({ page }) => {
    await signup(page)
    const id = await firstAlertId(page)
    test.skip(!id, 'no alerts seeded')
    await page.goto(APP_BASE + `/alerts/${id}`)
    await page
      .getByRole('link', { name: /declare incident/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/incidents/)
  })

  test('renders condition pre block', async ({ page }) => {
    await signup(page)
    const id = await firstAlertId(page)
    test.skip(!id, 'no alerts seeded')
    await gotoAndWait(page, APP_BASE + `/alerts/${id}`, (r) =>
      new RegExp(`/api/alerts/${id}`).test(r.url()),
    )
    await expect(page.locator('pre').first()).toBeVisible({ timeout: 5_000 })
  })
})
