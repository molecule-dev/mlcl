import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, APP_BASE, captureNetwork, requireAccessToken, signup } from './_helpers'

async function emitEvent(page: import('@playwright/test').Page, token: string, name: string) {
  const r = await page.request.post(API_BASE + '/events', {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: { name, payload: { id: 'evt_test', total: 42 } },
  })
  expect(r.ok()).toBe(true)
}

// EventDetail uses the URL param as the event NAME (not a UUID) — see
// /events list page which links via `/events/{encodeURIComponent(event.name)}`.
test.describe('/events/:name (EventDetail)', () => {
  test('renders the event name as the page heading', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await emitEvent(page, token, 'order.completed')

    await page.goto(APP_BASE + '/events/order.completed')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    await expect(
      page.getByRole('heading', { level: 1, name: /order\.completed/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('GET /api/events?name=… fires on render to hydrate event history', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    await emitEvent(page, token, 'invoice.paid')

    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/events/invoice.paid')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const got = reqs.find(
      (x) => x.method === 'GET' && /\/api\/events\?name=invoice\.paid/.test(x.url),
    )
    expect(got, 'GET /api/events?name=invoice.paid expected').toBeDefined()
    expect(got!.status).toBe(200)
  })

  test('uncataloged event name still renders the shell without crashing', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/never.fired.before')
    await expect(page.locator('body')).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 1, name: /never\.fired\.before/i }).first(),
    ).toBeVisible({ timeout: 10_000 })
  })

  test('back link returns to /events list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/events/subscription.created')
    await page
      .getByRole('link', { name: /^events$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/events(?:\b|$)/, { timeout: 5_000 })
  })
})
