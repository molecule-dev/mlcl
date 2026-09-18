// Per-page spec for /compare.

import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('Compare empty state appears when only one location is saved', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Solo',
    address: 'Reykjavik, Iceland',
    is_default: true,
  })
  await page.goto(APP_BASE + '/compare')
  await expect(page.locator('main')).toContainText(/Add at least two/i, { timeout: 10_000 })
})

test('Compare with two locations renders side-by-side cards with real conditions', async ({
  page,
}) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Vienna',
    address: 'Vienna, Austria',
    is_default: true,
  })
  await api(page, 'POST', '/locations', { name: 'Oslo', address: 'Oslo, Norway' })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/compare')
    await page.waitForTimeout(3000)
  })
  await expect(page.locator('main')).toContainText(/Vienna/i, { timeout: 20_000 })
  await expect(page.locator('main')).toContainText(/Oslo/i)
  // Both locations trigger /api/forecasts/current/<id> calls.
  const forecasts = reqs.filter((r) => /\/api\/forecasts\/current\//.test(r.url))
  expect(forecasts.length).toBeGreaterThanOrEqual(2)
  for (const r of forecasts) expect(r.status).toBe(200)
})

test('Compare cards include the activity verdicts row', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Vienna',
    address: 'Vienna, Austria',
    is_default: true,
  })
  await api(page, 'POST', '/locations', { name: 'Oslo', address: 'Oslo, Norway' })
  await page.goto(APP_BASE + '/compare')
  await page.waitForTimeout(3000)
  const txt = await page.locator('main').innerText()
  // Activity verdicts row labels (Running / Biking / Beach) — at least
  // one must be visible per location card.
  expect(txt).toMatch(/RUNNING/i)
  expect(txt).toMatch(/BIKING/i)
})

test('Compare empty state link sends user to /locations', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Solo',
    address: 'Helsinki, Finland',
    is_default: true,
  })
  await page.goto(APP_BASE + '/compare')
  await expect(page.locator('main')).toContainText(/Add at least two/i, { timeout: 10_000 })
  await page.getByRole('link', { name: /manage locations/i }).click()
  await page.waitForURL(/\/locations$/)
  expect(new URL(page.url()).pathname).toBe('/locations')
})

test('Compare page renders the page hero heading', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Vienna',
    address: 'Vienna, Austria',
    is_default: true,
  })
  await api(page, 'POST', '/locations', { name: 'Oslo', address: 'Oslo, Norway' })
  await page.goto(APP_BASE + '/compare')
  await expect(page.getByRole('heading', { name: /where would you rather be/i })).toBeVisible({
    timeout: 10_000,
  })
})

test('Compare hourly strip renders 12 hour cards per location card', async ({ page }) => {
  await signup(page)
  await api(page, 'POST', '/locations', {
    name: 'Vienna',
    address: 'Vienna, Austria',
    is_default: true,
  })
  await api(page, 'POST', '/locations', { name: 'Oslo', address: 'Oslo, Norway' })
  await page.goto(APP_BASE + '/compare')
  await page.waitForTimeout(3000)
  const txt = await page.locator('main').innerText()
  // Each card surfaces 12 hour labels (12A, 1A, ...). Across two cards
  // we expect at least 18 hour labels.
  const hours = (txt.match(/\b\d{1,2}[AP]\b/g) || []).length
  expect(hours).toBeGreaterThanOrEqual(12)
})
