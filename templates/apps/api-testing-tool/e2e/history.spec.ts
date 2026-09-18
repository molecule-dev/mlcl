import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/history', () => {
  test('renders the page heading after auth bootstrap', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByRole('heading', { name: /^Run history$/i, level: 1 })).toBeVisible()
  })

  test('"All" filter chip resets the URL hash to #all', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history#success')
    await page.locator('[data-mol-id="history-filter-all"]').click()
    await expect(page).toHaveURL(/#all$/)
  })

  test('"2xx" filter chip flips the URL hash to #success', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await page.locator('[data-mol-id="history-filter-success"]').click()
    await expect(page).toHaveURL(/#success$/)
  })

  test('"3xx" filter chip flips the URL hash to #redirect', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await page.locator('[data-mol-id="history-filter-redirect"]').click()
    await expect(page).toHaveURL(/#redirect$/)
  })

  test('"4xx" filter chip flips the URL hash to #clientError', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await page.locator('[data-mol-id="history-filter-clientError"]').click()
    await expect(page).toHaveURL(/#clientError$/)
  })

  test('"5xx" filter chip flips the URL hash to #serverError', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await page.locator('[data-mol-id="history-filter-serverError"]').click()
    await expect(page).toHaveURL(/#serverError$/)
  })

  test('empty state renders for a fresh user with no history', async ({ browser }) => {
    const ctx = await browser.newContext()
    const page = await ctx.newPage()
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByText(/Nothing here yet/i)).toBeVisible()
    await ctx.close()
  })

  test('"realtime" pill renders next to the H1', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/history')
    await expect(page.getByText(/realtime/i)).toBeVisible()
  })

  test('GET /api/history?limit=50 fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/history')
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
    })
    expect(
      reqs.some((r) => r.method === 'GET' && /\/api\/history\?limit=50/.test(r.url)),
      'GET /api/history?limit=50 must be observed',
    ).toBeTruthy()
  })
})
