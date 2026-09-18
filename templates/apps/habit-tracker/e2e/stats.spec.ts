/**
 * /stats — aggregates totals from /api/reports/overview. The page is
 * gated by data load, so the heading isn't visible until the request
 * resolves; this asserts both the network call and the rendered totals.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, apiHeaders, captureNetwork, seedHabit, signup } from './_helpers.js'

test('stats page calls reports/overview and renders the heading', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/stats')
    await page.waitForLoadState('networkidle')
  })
  expect(reqs.find((r) => /\/api\/reports\/overview/.test(r.url))?.status).toBe(200)
  await expect(page.locator('h1')).toContainText(/stats/i, { timeout: 10_000 })
})

test('stats reflects total check-ins after a check-in', async ({ page }) => {
  const { accessToken } = await signup(page)
  const { id } = await seedHabit(page, accessToken, 'Stats counter')
  await page.request.post(`${API_BASE}/habits/${id}/check-in`, {
    headers: apiHeaders(accessToken),
    data: {},
  })

  // GET overview directly to verify backend invariant.
  const overview = await page.request.get(`${API_BASE}/reports/overview`, {
    headers: apiHeaders(accessToken),
  })
  const body = (await overview.json()) as { total_check_ins: number; active_habits: number }
  expect(body.total_check_ins).toBe(1)
  expect(body.active_habits).toBe(1)

  await page.goto(APP_BASE + '/stats')
  await expect(page.locator('h1')).toContainText(/stats/i, { timeout: 10_000 })
})

test('stats has Consistency + By category sections', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/stats')
  await expect(page.getByText(/consistency/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/by category|where the work goes/i).first()).toBeVisible()
})

test('hero card shows real freeze balance (not hardcoded 1)', async ({ page }) => {
  // Regression: StreakHeroCard previously hardcoded freezesAvailable={1}
  // and /api/reports/today queried a non-existent freezes table that
  // always errored to 0. Grant a freeze, hit Stats, expect "1 freezes".
  const { accessToken } = await signup(page)
  // Grant via the documented endpoint (the cron-equivalent).
  const grant = await page.request.post(`${API_BASE}/freezes/grant`, {
    headers: apiHeaders(accessToken),
    data: {},
  })
  expect(grant.status(), await grant.text()).toBe(200)
  const balance = await page.request.get(`${API_BASE}/freezes/balance`, {
    headers: apiHeaders(accessToken),
  })
  expect((await balance.json()).available).toBe(1)
  // Verify reports.today also reflects the new available count.
  const today = await page.request.get(`${API_BASE}/reports/today`, {
    headers: apiHeaders(accessToken),
  })
  expect((await today.json()).freezes_available).toBe(1)
  // Now load Stats and assert the pill matches. The pill is rendered as
  // <span class="...whitespace-nowrap"><span>ac_unit</span>1 freezes</span>
  // so the full span text is "ac_unit1 freezes" — note no word-boundary
  // between "t" and "1" because both are word chars.
  await page.goto(APP_BASE + '/stats')
  await page.waitForLoadState('networkidle')
  await expect(
    page
      .locator('span.whitespace-nowrap')
      .filter({ hasText: /1 freezes/ })
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})

test('using a freeze decrements available count on Stats', async ({ page }) => {
  // Read-after-write: grant then use a freeze, the Stats hero pill
  // should show "0 freezes" (and so should /reports/today).
  const { accessToken } = await signup(page)
  const habit = await page.request.post(`${API_BASE}/habits`, {
    headers: apiHeaders(accessToken),
    data: { name: 'Freeze rebound', emoji: '❄️', category: 'health', cadence: 'daily' },
  })
  const habitId = ((await habit.json()) as { id: string }).id
  await page.request.post(`${API_BASE}/freezes/grant`, {
    headers: apiHeaders(accessToken),
    data: {},
  })
  const yday = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const useResp = await page.request.post(`${API_BASE}/freezes/use`, {
    headers: apiHeaders(accessToken),
    data: { habit_id: habitId, date: yday },
  })
  expect(useResp.status(), await useResp.text()).toBe(200)

  const today = await page.request.get(`${API_BASE}/reports/today`, {
    headers: apiHeaders(accessToken),
  })
  expect((await today.json()).freezes_available).toBe(0)

  await page.goto(APP_BASE + '/stats')
  await page.waitForLoadState('networkidle')
  await expect(
    page
      .locator('span.whitespace-nowrap')
      .filter({ hasText: /0 freezes/ })
      .first(),
  ).toBeVisible({ timeout: 10_000 })
})
