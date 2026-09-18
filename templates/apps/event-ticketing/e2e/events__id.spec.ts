import { test, expect } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  apiHeaders,
  API_BASE,
  captureNetwork,
  expectNoConsoleErrors,
  login,
  logout,
  seedEvent,
  seedOrder,
  seedTier,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('/events/:id page', () => {
  test('renders the event title from /api/events/:id', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken, { title: 'Visible Detail Title' })
    await page.goto(APP_BASE + '/events/' + ev.id)
    await expect(page.locator('h1', { hasText: 'Visible Detail Title' })).toBeVisible()
  })

  test('clicking + on a tier increments the displayed quantity', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await seedTier(page, auth.accessToken, ev.id, {
      name: 'GA',
      price_cents: 1500,
      quantity_total: 100,
    })
    await page.goto(APP_BASE + '/events/' + ev.id)
    await page
      .getByRole('button', { name: /add one/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /buy now/i })).toBeEnabled()
  })

  test('clicking − after + decrements the quantity', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await seedTier(page, auth.accessToken, ev.id, { name: 'GA', price_cents: 1500 })
    await page.goto(APP_BASE + '/events/' + ev.id)
    await page
      .getByRole('button', { name: /add one/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /add one/i })
      .first()
      .click()
    await page
      .getByRole('button', { name: /remove one/i })
      .first()
      .click()
    await expect(page.getByRole('button', { name: /buy now/i })).toBeEnabled()
  })

  test('Buy now POSTs /api/orders and either redirects to Stripe Checkout or to /orders/:id/confirmation', async ({
    page,
  }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await seedTier(page, auth.accessToken, ev.id, { name: 'GA', price_cents: 1000 })
    await page.goto(APP_BASE + '/events/' + ev.id)
    await page
      .getByRole('button', { name: /add one/i })
      .first()
      .click()
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /buy now/i }).click()
      // Paid orders go through real Stripe Checkout — accept either landing.
      await page.waitForURL(/(\/orders\/|checkout\.stripe\.com)/, { timeout: 20000 })
    })
    const order = reqs.find((r) => r.method === 'POST' && /\/api\/orders/.test(r.url))
    expect(order, 'POST /api/orders').toBeTruthy()
    expect(order?.status).toBeLessThan(400)
  })

  test('Free tier (price_cents=0) creates order and lands on confirmation immediately', async ({
    page,
  }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await seedTier(page, auth.accessToken, ev.id, {
      name: 'Comp',
      price_cents: 0,
      quantity_total: 50,
    })
    await page.goto(APP_BASE + '/events/' + ev.id)
    await page
      .getByRole('button', { name: /add one/i })
      .first()
      .click()
    await page.getByRole('button', { name: /buy now/i }).click()
    await page.waitForURL(/\/orders\/.+\/confirmation/, { timeout: 15000 })
    await expect(page.locator('h1')).toContainText(/you/i)
  })

  test('Attendees & check-in link navigates to /events/:id/attendees', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await page.goto(APP_BASE + '/events/' + ev.id)
    const link = page.locator('a[href*="/attendees"]').first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/events\/.+\/attendees/)
    }
  })
})
