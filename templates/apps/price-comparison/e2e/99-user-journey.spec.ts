import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  APP_BASE,
  authHeaders,
  API_BASE,
  listAlerts,
  listProducts,
  listWatchlist,
  seedCatalog,
  signup,
  uniqueEmail,
} from './_helpers.js'

test.describe('99 user-journey', () => {
  test('signup → seed → search → product → watch → alert → notifications → settings', async ({
    page,
  }) => {
    /* Fleet convention (see telemedicine et al): an 11-step journey needs more
       than the 45s default when the suite runs 2 workers on a loaded machine —
       navigations alone eat the budget and the test dies mid-route. */
    test.setTimeout(120_000)

    const email = uniqueEmail('journey')
    const { accessToken, userId } = await signup(page, email)
    expect(accessToken).toBeTruthy()
    expect(userId).toBeTruthy()

    // 1. Seed the catalog (idempotent)
    await seedCatalog(page, accessToken)
    const products = await listProducts(page, accessToken)
    expect(products.length).toBeGreaterThanOrEqual(5)

    // 2. Land on dashboard
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.locator('[data-test=dashboard-page]')).toBeVisible({ timeout: 15_000 })

    // 3. Browse search → click first product
    await page.goto(APP_BASE + '/search')
    await expect(page.locator('[data-test=search-grid]')).toBeVisible({ timeout: 15_000 })
    const firstCard = page.locator('[data-test=search-grid] a[href^="/products/"]').first()
    await firstCard.waitFor({ state: 'visible', timeout: 10_000 })
    const href = await firstCard.getAttribute('href')
    expect(href).toMatch(/^\/products\//)
    await firstCard.click()
    await expect(page.locator('[data-test=product-detail-page]')).toBeVisible({ timeout: 15_000 })

    // 4. Add to watchlist via UI
    await page.locator('[data-test=add-watchlist]').click()
    await page.waitForTimeout(800)
    const watch = await listWatchlist(page, accessToken)
    expect(watch.length).toBeGreaterThanOrEqual(1)

    // 5. Create an alert via API (cleaner than navigating dialog)
    const target = products.find((p) => p.id === watch[0].product_id) ?? products[0]
    const create = await page.request.post(`${API_BASE}/alerts`, {
      headers: authHeaders(accessToken),
      data: { productId: target.id, targetPrice: 9.99, channel: 'email' },
      failOnStatusCode: false,
    })
    expect([200, 201].includes(create.status())).toBe(true)
    const alerts = await listAlerts(page, accessToken)
    expect(alerts.length).toBeGreaterThanOrEqual(1)

    // 6. Visit alerts page
    await page.goto(APP_BASE + '/alerts')
    await expect(page.locator('[data-test=alerts-page]')).toBeVisible({ timeout: 15_000 })

    // 7. Notifications auto-seeded — page renders
    await page.goto(APP_BASE + '/notifications')
    await expect(page.locator('[data-test=notifications-page]')).toBeVisible({ timeout: 15_000 })

    // 8. Settings — change name and persist
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-test=settings-page]')).toBeVisible({ timeout: 15_000 })
    await page.locator('[data-test=settings-name]').fill('Journey Sift')
    await page.locator('[data-test=settings-save]').click()
    await page.waitForTimeout(1500)
    const meRes = await page.request.get(`${API_BASE}/users/${userId}`, {
      headers: authHeaders(accessToken),
    })
    const me = (await meRes.json()) as { props: { name?: string } } | { name?: string }
    const name = 'props' in me ? me.props.name : me.name
    expect(name).toBe('Journey Sift')

    // 9. Categories renders dynamic grid
    await page.goto(APP_BASE + '/categories')
    await expect(page.locator('[data-test=categories-grid]')).toBeVisible({ timeout: 15_000 })

    // 10. Deals page renders
    await page.goto(APP_BASE + '/deals')
    await expect(page.locator('[data-test=deals-page]')).toBeVisible({ timeout: 15_000 })

    // 11. Profile renders with persisted name
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-test=profile-display-name]')).toContainText(/Journey/i, {
      timeout: 15_000,
    })
  })
})
