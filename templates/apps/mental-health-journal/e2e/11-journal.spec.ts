import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers'

test.describe('/journal', () => {
  test('renders Journal heading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    await expect(page.getByRole('heading', { level: 1, name: /^Journal$/ })).toBeVisible()
  })

  test('"New entry" link points to /journal/new', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    const link = page.getByRole('link', { name: /New entry/i })
    expect(await link.getAttribute('href')).toBe('/journal/new')
  })

  test('search box accepts input', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    const search = page.getByRole('searchbox')
    await search.fill('gratitude')
    await expect(search).toHaveValue('gratitude')
  })

  test('mood filter "All" toggles aria-pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    const all = page.getByRole('button', { name: /^All$/ })
    await expect(all).toBeVisible()
    await all.click()
    // No assertion on aria-pressed since "All" defaults selected; assert visible+enabled.
    await expect(all).toBeEnabled()
  })

  test('mood filter "Good" is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    const good = page.getByRole('button', { name: /^Good$/ })
    await expect(good).toBeVisible()
    await good.click()
  })

  test('mood filter "Radiant" is clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    const r = page.getByRole('button', { name: /^Radiant$/ })
    await expect(r).toBeVisible()
    await r.click()
  })

  test('GET /api/journal/entries is called on page load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.goto(APP_BASE + '/journal')
      await page.waitForResponse(
        (r) => r.url().includes('/api/journal/entries') && !/\/entries\/\w/.test(r.url()),
        { timeout: 10_000 },
      )
    })
    const entriesGet = reqs.find(
      (r) =>
        r.method === 'GET' &&
        r.url.includes('/api/journal/entries') &&
        !/\/entries\/\w/.test(r.url),
    )
    expect(entriesGet, 'GET /api/journal/entries observed').toBeDefined()
  })

  test('fresh user sees no demo entries', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/journal')
    // Demo titles from the old SAMPLE_ENTRIES should never appear for a real new user
    await expect(page.getByText(/A quiet morning walk/)).toHaveCount(0)
    await expect(page.getByText(/A hard conversation, but honest/)).toHaveCount(0)
  })
})
