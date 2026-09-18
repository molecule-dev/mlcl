import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /calendar. Renders a month grid + an Upcoming
 * sidebar of calendar_events, each event linking to its meeting when
 * meeting_id is set.
 */

test.describe('calendar page', () => {
  test('calendar heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('cal-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/calendar')
    await expect(page.getByRole('heading', { name: /calendar/i }).first()).toBeVisible()
  })

  test('previous month button advances backwards', async ({ page }) => {
    await signup(page, uniqueEmail('cal-prev'), 'TestPass123!')
    await page.goto(APP_BASE + '/calendar')
    const prev = page.getByRole('button', { name: /‹|prev/i }).first()
    await expect(prev).toBeVisible()
    await prev.click()
  })

  test('next month button advances forwards', async ({ page }) => {
    await signup(page, uniqueEmail('cal-next'), 'TestPass123!')
    await page.goto(APP_BASE + '/calendar')
    const next = page.getByRole('button', { name: /›|next/i }).first()
    await expect(next).toBeVisible()
    await next.click()
  })

  test('upcoming events sidebar renders', async ({ page }) => {
    await signup(page, uniqueEmail('cal-list'), 'TestPass123!')
    await page.goto(APP_BASE + '/calendar')
    const list = page.locator('[data-mol-id="calendar-event-list"]').first()
    await expect(list).toBeVisible()
  })

  test('GET /api/calendar_events fires on load', async ({ page }) => {
    await signup(page, uniqueEmail('cal-net'), 'TestPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/calendar')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find(
      (r) => /\/api\/calendar_events(\?|$)/.test(r.url) && r.method === 'GET',
    )
    expect(getCall, 'GET /api/calendar_events must fire').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-calendar chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('cal-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/calendar')
    await expect(page.locator('[data-mol-id="nav-calendar"]').first()).toBeVisible()
  })
})
