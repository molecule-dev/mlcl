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

test.describe('/orders/:id/confirmation page', () => {
  test('renders the "you\u2019re in" heading', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/orders/' + order.id + '/confirmation')
    await expect(page.locator('h1')).toContainText(/you/i)
  })

  test('Open my tickets CTA navigates to /my-tickets', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    await page.goto(APP_BASE + '/orders/' + order.id + '/confirmation')
    await page.locator('a[href="/my-tickets"]').first().click()
    await expect(page).toHaveURL(/\/my-tickets/)
  })

  test('one ticket stub article per ticket purchased', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, {
      eventId: ev.id,
      tierId: tier.id,
      quantity: 2,
    })
    await page.goto(APP_BASE + '/orders/' + order.id + '/confirmation')
    await page.waitForLoadState('networkidle')
    expect(await page.getByRole('article').count()).toBeGreaterThanOrEqual(1)
  })

  test('hits GET /api/orders/:id and /api/tickets', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    const order = await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id })
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/orders/' + order.id + '/confirmation')
      await page.waitForLoadState('networkidle')
    })
    const o = reqs.find((r) => r.method === 'GET' && /\/api\/orders\//.test(r.url))
    expect(o, 'GET /api/orders/:id').toBeTruthy()
    const t = reqs.find((r) => r.method === 'GET' && /\/api\/tickets/.test(r.url))
    expect(t, 'GET /api/tickets').toBeTruthy()
  })
})
