import { test, expect } from '@molecule/app-e2e-fixtures-default'
import {
  APP_BASE,
  captureNetwork,
  createWebhookViaApi,
  requireAccessToken,
  signup,
} from './_helpers'

test.describe('/endpoints', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/endpoints')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders the empty state when no webhooks exist', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/endpoints')
    await expect(page.getByText(/haven't created|no endpoints/i).first()).toBeVisible()
  })

  test('shows a created webhook in the list (read-after-write)', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh = await createWebhookViaApi(page, token, {
      url: 'https://example.com/list-shows-this-' + Date.now(),
      description: 'list-shows-this',
    })
    await page.goto(APP_BASE + '/endpoints')
    await expect(page.getByText(wh.url).first()).toBeVisible({ timeout: 10_000 })
  })

  test('search filters the list by URL substring', async ({ page }) => {
    await signup(page)
    const token = await requireAccessToken(page)
    const wh1 = await createWebhookViaApi(page, token, {
      url: 'https://acme.example.com/webhooks/' + Date.now(),
      description: 'acme-only',
    })
    const wh2 = await createWebhookViaApi(page, token, {
      url: 'https://northwind.example.com/webhooks/' + Date.now(),
      description: 'northwind-only',
    })
    await page.goto(APP_BASE + '/endpoints')
    await expect(page.getByText(wh1.url)).toBeVisible()
    await expect(page.getByText(wh2.url)).toBeVisible()
    await page.locator('input[type="search"]').fill('acme')
    await expect(page.getByText(wh1.url)).toBeVisible()
    await expect(page.getByText(wh2.url)).toHaveCount(0)
  })

  test('"New endpoint" CTA navigates to /endpoints/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/endpoints')
    await page
      .getByRole('link', { name: /new endpoint/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/endpoints\/new/, { timeout: 10_000 })
  })

  test('GET /api/webhooks happens on render', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/endpoints')
      await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    })
    const r = reqs.find((x) => x.method === 'GET' && /\/api\/webhooks(?:\?|$)/.test(x.url))
    expect(r, 'GET /api/webhooks').toBeDefined()
    expect(r!.status).toBe(200)
  })
})
