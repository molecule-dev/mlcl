// Per-page spec for /dashboard. Verifies the empty state, the populated
// state with real Open-Meteo data, and the navigation links to the
// dependent pages.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Dashboard shows the empty state when the user has no locations', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.locator('main')).toContainText(/Add your first location/i, {
    timeout: 10_000,
  })
  await expect(page.getByRole('link', { name: /add a location/i }).first()).toHaveAttribute(
    'href',
    /\/locations/,
  )
})

test('Dashboard hero card renders real Open-Meteo data after a default location is set', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Boston',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  // Capture the forecast network calls fired by Dashboard so we know the
  // page is wired to the real /api/forecasts handlers, not a stub.
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(2500)
  })
  await expect(page.locator('main')).toContainText(/Boston/i, { timeout: 20_000 })
  const txt = await page.locator('main').innerText()
  expect(txt).toMatch(/\d{2,3}°F?/)
  expect(
    reqs.find((r) => /\/api\/forecasts\/current\//.test(r.url) && r.status === 200),
  ).toBeDefined()
})

test('Dashboard 12-hour outlook strip lists at least 6 hourly cards from /api/forecasts/hourly', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Boston',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(2500)
  })
  // The hourly call returns 24 rows; the dashboard renders the first 12.
  const hourly = reqs.find((r) => /\/api\/forecasts\/hourly\//.test(r.url))
  expect(hourly?.status).toBe(200)
  // Hours appear as e.g. "12A", "1A", "2A", ... "11A". Scan the text.
  const txt = await page.locator('main').innerText()
  const hourLabels = (txt.match(/\b\d{1,2}[AP]\b/g) || []).length
  expect(hourLabels).toBeGreaterThanOrEqual(6)
})

test('Dashboard 7-day outlook strip lists day cards from /api/forecasts/daily', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Boston',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/dashboard')
    await page.waitForTimeout(2500)
  })
  const daily = reqs.find((r) => /\/api\/forecasts\/daily\//.test(r.url))
  expect(daily?.status).toBe(200)
  const txt = await page.locator('main').innerText()
  // 7-day outlook surfaces day-of-week tokens (SUN/MON/...). Open-Meteo
  // returns the next seven days in `time` order.
  const days = (txt.match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/g) || []).length
  expect(days).toBeGreaterThanOrEqual(5)
})

test('Saved-location strip on the dashboard lists every saved location', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Helsinki',
    address: 'Helsinki, Finland',
    is_default: true,
  })
  await api(page, 'POST', '/locations', {
    name: 'Lisbon',
    address: 'Lisbon, Portugal',
  })
  await page.goto(APP_BASE + '/dashboard')
  await expect(page.locator('main')).toContainText(/Helsinki/i, { timeout: 15_000 })
  await expect(page.locator('main')).toContainText(/Lisbon/i)
})

test('Dashboard "See trends" link navigates to /trends', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Boston',
    address: 'Boston, MA, USA',
    is_default: true,
  })
  await page.goto(APP_BASE + '/dashboard')
  await page.waitForTimeout(2000)
  const trendsLink = page.getByRole('link', { name: /see trends/i })
  await expect(trendsLink).toBeVisible()
  await trendsLink.click()
  await expect(page).toHaveURL(/\/trends/)
})
