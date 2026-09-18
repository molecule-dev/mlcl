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

test.describe('/my-tickets page', () => {
  test('empty library shows the "Browse events" CTA', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-tickets')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="my-tickets-empty"]')).toBeVisible()
  })

  test('after purchase, ticket appears in the library', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id)
    await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id, quantity: 1 })
    await page.goto(APP_BASE + '/my-tickets')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="ticket-link"]').first()).toBeVisible()
  })

  test('Past filter chip can be clicked', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-tickets')
    await page.locator('[data-mol-id="filter-past"]').click()
  })

  test('Transferred filter chip can be clicked', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-tickets')
    await page.locator('[data-mol-id="filter-transferred"]').click()
  })

  test('Refunded filter chip can be clicked', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/my-tickets')
    await page.locator('[data-mol-id="filter-refunded"]').click()
  })

  test('hits GET /api/tickets on load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/my-tickets')
      await page.waitForLoadState('networkidle')
    })
    const t = reqs.find((r) => r.method === 'GET' && /\/api\/tickets/.test(r.url))
    expect(t).toBeTruthy()
    expect(t?.status).toBeLessThan(500)
  })
})
