import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/archive', () => {
  test.beforeEach(async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/archive')
  })

  test('fetches the archive via GET /api/puzzles/archive', async ({ page }) => {
    const respPromise = page.waitForResponse((r) => /\/api\/puzzles\/archive/.test(r.url()))
    await page.goto(APP_BASE + '/archive')
    const resp = await respPromise
    expect(resp.status()).toBeLessThan(400)
    await expect(page.getByRole('heading', { name: /^archive$/i })).toBeVisible()
  })

  test('renders one row per past day, newest first', async ({ page }) => {
    await page.locator('[data-mol-id="archive-list"]').waitFor()
    const rows = page.locator('[data-mol-id^="archive-link-"]')
    const count = await rows.count()
    expect(count).toBeGreaterThanOrEqual(7)
    const first = await rows.first().getAttribute('data-mol-id')
    const last = await rows.nth(count - 1).getAttribute('data-mol-id')
    expect(first && last && first > last, 'newest day listed first').toBe(true)
  })

  test('every row deep-links to its practice puzzle', async ({ page }) => {
    await page.locator('[data-mol-id="archive-list"]').waitFor()
    const href = await page.locator('[data-mol-id^="archive-link-"]').first().getAttribute('href')
    expect(href).toMatch(/^\/archive\/\d{4}-\d{2}-\d{2}$/)
  })

  test('a fresh account shows every day as not played', async ({ page }) => {
    await page.locator('[data-mol-id="archive-list"]').waitFor()
    const badges = page.getByText(/not played/i)
    expect(await badges.count()).toBeGreaterThanOrEqual(7)
  })

  test('clicking a row navigates to the practice game', async ({ page }) => {
    await page.locator('[data-mol-id="archive-list"]').waitFor()
    await page.locator('[data-mol-id^="archive-link-"]').first().click()
    await expect(page).toHaveURL(/\/archive\/\d{4}-\d{2}-\d{2}$/)
  })
})
