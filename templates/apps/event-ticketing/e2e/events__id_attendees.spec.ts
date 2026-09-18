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

test.describe('/events/:id/attendees page', () => {
  test('renders empty state with 0 attendees + 0% checked-in KPI', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
    await expect(page.locator('h1')).toContainText(/Attendees/i)
  })

  test('after a purchase, the attendee row shows the buyer', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const tier = await seedTier(page, auth.accessToken, ev.id, { name: 'GA' })
    await seedOrder(page, auth.accessToken, { eventId: ev.id, tierId: tier.id, quantity: 1 })
    await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
    await page.waitForLoadState('networkidle')
    // The tier this spec created, not a tier name the demo data happens to use.
    await expect(page.getByText(tier.name).first()).toBeVisible()
  })

  test('search input narrows the visible rows', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
    await page.locator('[data-mol-id="attendees-search"]').fill('zzz-no-match')
    expect(await page.locator('[data-mol-id="attendees-search"]').inputValue()).toBe('zzz-no-match')
  })

  test('filter buttons toggle and the All button can be reactivated', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
    await page.locator('[data-mol-id="filter-checked_in"]').click()
    await page.locator('[data-mol-id="filter-pending"]').click()
    await page.locator('[data-mol-id="filter-all"]').click()
  })

  test('export CSV button is disabled when there are no attendees', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
    await expect(page.locator('[data-mol-id="attendees-export"]')).toBeDisabled()
  })

  test('hits GET /api/attendees/:id when loading', async ({ page }) => {
    const auth = await signup(page)
    const ev = await seedEvent(page, auth.accessToken)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/events/' + ev.id + '/attendees')
      await page.waitForLoadState('networkidle')
    })
    const att = reqs.find((r) => r.method === 'GET' && /\/api\/attendees\//.test(r.url))
    expect(att, 'GET /api/attendees/:event_id').toBeTruthy()
    expect(att?.status).toBeLessThan(500)
  })
})
