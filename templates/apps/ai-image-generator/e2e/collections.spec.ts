import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, getCollections, signup } from './_helpers.js'

test.describe('/collections', () => {
  test('renders Collections h1 and fetches list', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/collections')
      await expect(page.getByRole('heading', { name: /^Collections$/i, level: 1 })).toBeVisible()
    })
    expect(reqs.some((r) => /\/api\/collections/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('"New collection" button issues POST /api/collections OR opens modal', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/collections')
    const before = await page.locator('a[href^="/collections/"]').count()
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /New collection/i }).click()
      await page.waitForTimeout(2000)
    })
    const after = await page.locator('a[href^="/collections/"]').count()
    const posted = reqs.some(
      (r) =>
        /\/api\/collections/.test(r.url) &&
        r.method === 'POST' &&
        r.status >= 200 &&
        r.status < 300,
    )
    expect(posted || after > before).toBeTruthy()
  })

  test('clicking a collection card navigates to /collections/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/collections')
    const link = page.locator('a[href^="/collections/"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(/\/collections\/[^/]+/)
  })

  test('renders every collection the API returns as a card heading', async ({ page }) => {
    await signup(page)
    // Read the collections from the same endpoint the page reads — naming the
    // starter collections breaks this spec the moment they are replaced.
    const collections = await getCollections(page)
    await page.goto(APP_BASE + '/collections')
    for (const collection of collections) {
      await expect(page.getByRole('heading', { name: collection.name!, level: 2 })).toBeVisible({
        timeout: 10000,
      })
    }
  })
})
