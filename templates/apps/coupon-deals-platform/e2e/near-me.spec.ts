import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Near-me page (/near-me)', () => {
  test('renders the page title', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/near-me')
    await expect(page.getByRole('heading', { name: /near me/i, level: 1 })).toBeVisible()
  })

  test('renders the radius subheading', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/near-me')
    await expect(page.getByText(/deals within/i).first()).toBeVisible()
  })

  test('renders the interactive map placeholder', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/near-me')
    await expect(page.getByText(/interactive map/i).first()).toBeVisible()
  })

  test('renders at least three nearby-deal rows', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/near-me')
    await page.waitForTimeout(1200)
    expect(await page.getByRole('listitem').count()).toBeGreaterThanOrEqual(3)
  })

  test('clicking a nearby deal nav to /deals/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/near-me')
    await page.waitForTimeout(800)
    await page.locator('a[href^="/deals/"]').first().click()
    await expect(page).toHaveURL(/\/deals\/[a-f0-9-]{8,}/)
  })

  test('each row shows a "km away" distance', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/near-me')
    await page.waitForTimeout(800)
    expect(await page.getByText(/km away/i).count()).toBeGreaterThanOrEqual(3)
  })

  test('page-load fetches /api/nearby_deals', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/near-me')
      await page.waitForTimeout(1000)
    })
    const calls = reqs.filter((r) => /\/api\/nearby[-_]deals/.test(r.url) && r.method === 'GET')
    expect(calls.length, 'GET /api/nearby_deals fired').toBeGreaterThan(0)
    expect(calls.every((r) => r.status === 200)).toBe(true)
  })
})
