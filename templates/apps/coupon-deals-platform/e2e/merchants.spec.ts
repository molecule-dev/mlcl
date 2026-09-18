import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Merchants listing page (/merchants)', () => {
  test('renders the page title', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/merchants')
    await expect(page.getByRole('heading', { name: 'Merchants', level: 1 })).toBeVisible()
  })

  test('renders the merchant search box', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/merchants')
    await expect(page.getByRole('searchbox', { name: /search merchants/i })).toBeVisible()
  })

  test('search box filters the merchant list as the user types', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/merchants')
    await page.waitForTimeout(800)
    const baselineCount = await page.getByRole('listitem').count()
    await page.getByRole('searchbox').fill('zzzzznoMerchantMatchesThis')
    await page.waitForTimeout(400)
    const filteredCount = await page.getByRole('listitem').count()
    expect(filteredCount, 'filter narrows list').toBeLessThan(baselineCount)
  })

  test('renders at least three merchant cards from /api/merchants', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/merchants')
    await page.waitForTimeout(800)
    expect(await page.getByRole('listitem').count()).toBeGreaterThanOrEqual(3)
  })

  test('clicking a merchant card navigates to /merchants/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/merchants')
    await page.waitForTimeout(800)
    await page.locator('a[href^="/merchants/"]').first().click()
    await expect(page).toHaveURL(/\/merchants\/[a-f0-9-]{8,}/)
  })

  test('each card shows the active-deal count', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/merchants')
    await page.waitForTimeout(800)
    expect(await page.getByText(/active deals/i).count()).toBeGreaterThanOrEqual(3)
  })

  test('page-load fetches /api/merchants', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/merchants')
      await page.waitForTimeout(1000)
    })
    const calls = reqs.filter((r) => /\/api\/merchants(\?|$)/.test(r.url) && r.method === 'GET')
    expect(calls.length, 'GET /api/merchants fired').toBeGreaterThan(0)
    expect(calls.every((r) => r.status === 200)).toBe(true)
  })
})
