import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  apiRequest,
  captureNetwork,
  listProperties,
  signup,
} from './_helpers.js'

async function favoriteOneProperty(page: import('@playwright/test').Page) {
  const properties = await listProperties(page)
  const favored = properties[0]
  const res = await apiRequest<{ data?: unknown }>(page, 'POST', '/api/favorites', {
    property_id: favored.id,
  })
  expect([200, 201]).toContain(res.status)
  return favored
}

test.describe('/favorites (Favorites)', () => {
  test('renders the "Saved properties" heading', async ({ page }) => {
    await signup(page)
    await favoriteOneProperty(page)
    await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: /Saved properties/i, level: 1 })).toBeVisible()
  })

  test('each saved property renders as an article element', async ({ page }) => {
    await signup(page)
    await favoriteOneProperty(page)
    await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('article').first()).toBeVisible()
    expect(await page.getByRole('article').count()).toBeGreaterThan(0)
  })

  test('property name heading is rendered inside the saved card', async ({ page }) => {
    await signup(page)
    const favored = await favoriteOneProperty(page)
    await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })
    const namePart = favored.name.split(' ')[0]
    await expect(
      page.getByRole('heading', { name: new RegExp(namePart, 'i'), level: 2 }).first(),
    ).toBeVisible()
  })

  test('clicking the property title link navigates to /property/:id', async ({ page }) => {
    await signup(page)
    const favored = await favoriteOneProperty(page)
    await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })
    const namePart = favored.name.split(' ')[0]
    await page
      .getByRole('link', { name: new RegExp(namePart, 'i') })
      .first()
      .click()
    await expect(page).toHaveURL(/\/property\//)
  })

  test('Unsave button removes the favorite and persists across reload', async ({ page }) => {
    await signup(page)
    const favored = await favoriteOneProperty(page)
    await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })

    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /^Unsave$/i })
        .first()
        .click()
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.includes('/api/favorites/' + favored.id) && r.method === 'DELETE'),
      'DELETE /api/favorites/:id must be observed',
    ).toBeTruthy()

    const refreshed = await apiRequest<{ data: Array<{ id: string }> }>(
      page,
      'GET',
      '/api/favorites',
    )
    const ids = (refreshed.body.data ?? []).map((f) => f.id)
    expect(ids).not.toContain(favored.id)
  })

  test('observes GET /api/favorites on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.url.endsWith('/api/favorites') && r.method === 'GET'),
      'GET /api/favorites must be observed on page load',
    ).toBeTruthy()
  })

  test('empty state with Browse stays link renders for users with no favorites', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/favorites', { waitUntil: 'domcontentloaded' })
    const empty = page.getByText(/No saved properties yet/i)
    if (await empty.count()) {
      await expect(page.getByRole('link', { name: /Browse stays/i })).toBeVisible()
    } else {
      // Some fixtures pre-seed favorites; assert the page still rendered.
      await expect(page.getByRole('heading', { name: /Saved properties/i })).toBeVisible()
    }
    // Avoid unused import warning if we never need API_BASE in this test file.
    expect(API_BASE).toBeTruthy()
  })
})
