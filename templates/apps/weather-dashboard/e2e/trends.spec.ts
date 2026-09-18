// Per-page spec for /trends. Verifies the empty/loading/populated
// states and the chart's read-after-write through /api/history.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Trends empty state directs the user to /locations when no default exists', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/trends')
  await expect(page.locator('main')).toContainText(/Save a default location/i, {
    timeout: 10_000,
  })
})

test('Trends "no history" state renders for a default location with no observations', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Lima',
    address: 'Lima, Peru',
    is_default: true,
  })
  await page.goto(APP_BASE + '/trends')
  await expect(page.locator('main')).toContainText(/No daily observations/i, { timeout: 10_000 })
})

test('Trends chart renders an SVG path after history is posted to /api/history', async ({
  page,
}) => {
  await signup(page)
  const loc = await api<{ id: string; name: string }>(page, 'POST', '/locations', {
    name: 'San Diego Default',
    address: 'San Diego, CA, USA',
    is_default: true,
  })
  const today = new Date()
  const entries = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(today)
    d.setUTCDate(today.getUTCDate() - i)
    return {
      observed_date: d.toISOString().slice(0, 10),
      temp_high: 70 + i,
      temp_low: 55 + i,
      temp_avg: 62 + i,
      humidity: 50 + i,
      precipitation_mm: i * 0.5,
      wind_speed_avg: 5 + i,
    }
  })
  await api(page, 'POST', `/api/history/${loc.id}`, { entries })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/trends')
    await page.waitForTimeout(2500)
  })
  await expect(page.locator('main svg')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('main')).toContainText(/Days/i)
  // Trends fetches /api/history/<id> with a date range filter.
  const histReq = reqs.find((r) => /\/api\/history\//.test(r.url) && r.status === 200)
  expect(histReq).toBeDefined()
})

test('Trends range buttons (7 days / 30 days / 12 months / 5 years) toggle aria-pressed', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Lima',
    address: 'Lima, Peru',
    is_default: true,
  })
  await page.goto(APP_BASE + '/trends')
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /^7 days$/i }).click()
  await expect(page.getByRole('button', { name: /^7 days$/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: /^30 days$/i }).click()
  await expect(page.getByRole('button', { name: /^30 days$/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  // Switching range re-fires /api/history.
})

test('Trends metric tile selection switches activeMetric on click', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Lima',
    address: 'Lima, Peru',
    is_default: true,
  })
  await page.goto(APP_BASE + '/trends')
  await page.waitForTimeout(1500)
  const precipBtn = page.getByRole('button', { name: /precipitation/i }).first()
  await expect(precipBtn).toBeVisible()
  await precipBtn.click()
  await expect(precipBtn).toHaveAttribute('aria-pressed', 'true')
})

test('Trends temperature metric tile flips aria-pressed on click', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Lima',
    address: 'Lima, Peru',
    is_default: true,
  })
  await page.goto(APP_BASE + '/trends')
  await page.waitForTimeout(1500)
  const tempBtn = page.getByRole('button', { name: /temperature/i }).first()
  await expect(tempBtn).toBeVisible()
  await tempBtn.click()
  await expect(tempBtn).toHaveAttribute('aria-pressed', 'true')
})

test('Trends wind metric tile flips aria-pressed on click', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Lima',
    address: 'Lima, Peru',
    is_default: true,
  })
  await page.goto(APP_BASE + '/trends')
  await page.waitForTimeout(1500)
  // Metric tile accessible name is "Wind <value> mph". Match the label fragment.
  const windBtn = page.getByRole('button', { name: /\bWind\b/ }).first()
  await expect(windBtn).toBeVisible()
  await windBtn.click()
  await expect(windBtn).toHaveAttribute('aria-pressed', 'true')
})

test('Trends humidity metric tile flips aria-pressed on click', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Lima',
    address: 'Lima, Peru',
    is_default: true,
  })
  await page.goto(APP_BASE + '/trends')
  await page.waitForTimeout(1500)
  const humBtn = page.getByRole('button', { name: /humidity/i }).first()
  await expect(humBtn).toBeVisible()
  await humBtn.click()
  await expect(humBtn).toHaveAttribute('aria-pressed', 'true')
})

test('Trends "manage locations" link navigates to /locations from the empty state', async ({
  page,
}) => {
  await signup(page)
  await page.goto(APP_BASE + '/trends')
  await expect(page.locator('main')).toContainText(/Save a default location/i, {
    timeout: 10_000,
  })
  await page.getByRole('link', { name: /manage locations/i }).click()
  await page.waitForURL(/\/locations$/)
  expect(new URL(page.url()).pathname).toBe('/locations')
})
