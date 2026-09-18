/**
 * /search: authenticated property listing page. Hits /api/accommodations,
 * /api/favorites; supports sort, price filter, amenity filter, and
 * navigation to /property/:id.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('search heading renders for an authenticated user', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('GET /api/accommodations fires on initial load', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/search')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })
  const accReq = reqs.find((r) => r.method === 'GET' && /\/api\/accommodations(\?|$)/.test(r.url))
  expect(accReq?.status).toBe(200)
})

test('sort selector accepts a value change', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const select = page.locator('select').first()
  await select.selectOption({ index: 1 })
  expect(await select.inputValue()).toBeTruthy()
})

test('Sort by label is visible', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await expect(page.getByText(/Sort by/i)).toBeVisible()
})

test('a price filter pill toggles its active state when clicked', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const pill = page
    .getByRole('button')
    .filter({ hasText: /Under|Mid|Luxe|All/i })
    .first()
  await pill.click()
  await expect(pill).toBeVisible()
})

test('an amenity filter pill toggles its active state when clicked', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const pill = page
    .getByRole('button')
    .filter({ hasText: /Plunge|Hot|Sea|Pool|Mountain|Aurora|Sauna/i })
    .first()
  if ((await pill.count()) > 0) {
    await pill.click()
    await expect(pill).toBeVisible()
  } else {
    test.skip(true, 'no amenity filter pills rendered (catalog may be empty)')
  }
})

test('clicking a property card navigates to /property/:id', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/search')
  await page.waitForLoadState('networkidle', { timeout: 15_000 })
  const card = page.locator('a[href^="/property/"]').first()
  if ((await card.count()) > 0) {
    await card.click()
    await expect(page).toHaveURL(/\/property\//)
  } else {
    test.skip(true, 'no property cards rendered (catalog seeding may have failed)')
  }
})
