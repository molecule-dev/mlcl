import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

/**
 * Per-page spec for /search. Single search box + four filter pills.
 * Backed by GET /api/search?q=…&filter=… debounced as the user types.
 */

test.describe('search page', () => {
  test('search heading is visible', async ({ page }) => {
    await signup(page, uniqueEmail('s-h'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('heading', { name: /^search$/i }).first()).toBeVisible()
  })

  test('search input is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('s-input'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('searchbox').first()).toBeVisible()
  })

  test('empty hint is shown until the user types', async ({ page }) => {
    await signup(page, uniqueEmail('s-empty'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByText(/type to search transcripts/i).first()).toBeVisible()
  })

  test('All time filter pill is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('s-all'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('button', { name: /all time/i }).first()).toBeVisible()
  })

  test('Last 7 days filter pill is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('s-7d'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('button', { name: /last 7 days/i }).first()).toBeVisible()
  })

  test('Last 30 days filter pill is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('s-30d'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('button', { name: /last 30 days/i }).first()).toBeVisible()
  })

  test('Mentions me filter pill is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('s-men'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.getByRole('button', { name: /mentions me/i }).first()).toBeVisible()
  })

  test('typing fires GET /api/search with q & filter', async ({ page }) => {
    await signup(page, uniqueEmail('s-net'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('searchbox').first().fill('decision')
      await page.waitForLoadState('networkidle')
    })
    const getCall = reqs.find((r) => /\/api\/search\?q=/.test(r.url) && r.method === 'GET')
    expect(getCall, 'GET /api/search?q=… must fire on type').toBeTruthy()
    expect([200, 201]).toContain(getCall!.status)
  })

  test('sidebar nav-search chrome is rendered', async ({ page }) => {
    await signup(page, uniqueEmail('s-nav'), 'TestPass123!')
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-mol-id="nav-search"]').first()).toBeVisible()
  })
})
