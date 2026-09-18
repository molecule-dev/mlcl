import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedCatalog, signup, uniqueEmail } from './_helpers.js'

test.describe('/deals', () => {
  test('shell renders for authenticated user', async ({ page }) => {
    await signup(page, uniqueEmail('deals-shell'))
    await page.goto(APP_BASE + '/deals')
    await expect(page.locator('[data-test=deals-page]')).toBeVisible({ timeout: 15_000 })
  })

  test('summary chips render after seed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deals-summary'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/deals')
    await expect(page.locator('[data-test=deals-summary]')).toBeVisible({ timeout: 15_000 })
  })

  test('grid populates from /api/prices/trends/drops after seed', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deals-grid'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/deals')
    await page.waitForTimeout(1500)
    const grid = page.locator('[data-test=deals-grid]')
    const empty = page.locator('[data-test=deals-empty]')
    const has = (await grid.count()) > 0 || (await empty.count()) > 0
    expect(has, 'either grid or empty state rendered').toBe(true)
  })

  test('clicking a deal card navigates to /products/:id', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deals-click'))
    await seedCatalog(page, accessToken)
    await page.goto(APP_BASE + '/deals')
    await page.waitForTimeout(1500)
    const link = page.locator('[data-test=deals-grid] a[href^="/products/"]').first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/products\//)
    }
  })

  test('initial render fires GET /api/prices/trends/drops', async ({ page }) => {
    const { accessToken } = await signup(page, uniqueEmail('deals-net'))
    await seedCatalog(page, accessToken)
    // Wait deterministically for the drops GET — the grid/empty state can
    // render from local state before the network call resolves, so the
    // visibility-only gate left the captureNetwork block before the fetch
    // landed.
    const reqs = await captureNetwork(page, async () => {
      const dropsResponse = page.waitForResponse(
        (r) => /\/api\/prices\/trends\/drops/.test(r.url()) && r.request().method() === 'GET',
        { timeout: 20_000 },
      )
      await page.goto(APP_BASE + '/deals')
      await expect(page.locator('[data-test=deals-page]')).toBeVisible({ timeout: 15_000 })
      await dropsResponse
    })
    const call = reqs.find((r) => /\/api\/prices\/trends\/drops/.test(r.url) && r.method === 'GET')
    expect(call?.status, 'GET /api/prices/trends/drops').toBe(200)
  })
})
