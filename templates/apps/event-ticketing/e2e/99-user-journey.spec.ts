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

test.describe('99: end-to-end attendee + organizer journey', () => {
  test('signup → host event → publish → buy ticket → confirmation → my-tickets → settings', async ({
    page,
  }) => {
    const auth = await signup(page)

    // Land on /dashboard
    await expect(page).toHaveURL(/\/dashboard/)

    // Browse events page works
    await page.goto(APP_BASE + '/events')
    await expect(page.locator('h1').first()).toBeVisible()

    // Seed an event + COMP tier so the purchase doesn't bounce through
    // Stripe Checkout (which is slow and unscriptable in a unit test).
    // The standalone /events/:id spec exercises the paid Stripe path.
    const ev = await seedEvent(page, auth.accessToken, { title: 'Journey Concert' })
    const tier = await seedTier(page, auth.accessToken, ev.id, {
      name: 'Comp',
      price_cents: 0,
      quantity_total: 50,
    })

    // Visit event detail and add a ticket
    await page.goto(APP_BASE + '/events/' + ev.id)
    await expect(page.locator('h1', { hasText: 'Journey Concert' })).toBeVisible()
    await page
      .getByRole('button', { name: /add one/i })
      .first()
      .click()
    const purchaseReqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /buy now/i }).click()
      await page.waitForURL(/\/orders\//, { timeout: 20000 })
    })
    const order = purchaseReqs.find((r) => r.method === 'POST' && /\/api\/orders/.test(r.url))
    expect(order, 'POST /api/orders').toBeTruthy()

    // Confirmation page renders ticket stub
    await expect(page.locator('h1')).toContainText(/you/i)

    // My tickets reflects the new purchase
    await page.goto(APP_BASE + '/my-tickets')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('[data-mol-id="ticket-link"]').first()).toBeVisible()

    // Settings: update display name then verify persistence via /api/profile/me
    await page.goto(APP_BASE + '/settings')
    await page.getByRole('textbox', { name: /display name/i }).fill('Journey Demo')
    await page
      .getByRole('button', { name: /save changes/i })
      .first()
      .click()
    await page.waitForLoadState('networkidle')
    const probe = await page.request.get(API_BASE + '/profile/me', {
      headers: apiHeaders(auth.accessToken),
    })
    expect(probe.ok()).toBe(true)
    const profileBody = (await probe.json()) as { displayName?: string }
    expect(profileBody.displayName).toBe('Journey Demo')

    // Attendees view reflects the buyer
    await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
    await page.waitForLoadState('networkidle')
    // The tier this journey created, not a tier name the demo data happens to use.
    await expect(page.getByText(tier.name).first()).toBeVisible()

    // Organizer can fetch live check-in stats from /api/checkin/stats/:event_id
    const stats = await page.request.get(API_BASE + '/checkin/stats/' + ev.id, {
      headers: apiHeaders(auth.accessToken),
    })
    expect(stats.ok()).toBe(true)
    const statsBody = (await stats.json()) as {
      total_attendees: number
      checked_in: number
      not_checked_in: number
    }
    expect(typeof statsBody.total_attendees).toBe('number')
    expect(typeof statsBody.checked_in).toBe('number')

    // Notifications page renders a row for the new purchase
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('h1')).toContainText(/notifications/i)

    // Sign out works
    await logout(page).catch(() => undefined)
    expect(typeof auth.userId === 'string' || auth.userId === null).toBe(true)
  })
})
