import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('Deals listing page (/deals)', () => {
  test('renders the page title', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('heading', { name: 'Deals', level: 1 })).toBeVisible()
  })

  test('"All" filter button is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible()
  })

  test('"Restaurants" category filter is present and clickable', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    const btn = page.getByRole('button', { name: 'Restaurants' })
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForTimeout(500)
  })

  test('"Beauty" category filter is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('button', { name: 'Beauty' })).toBeVisible()
  })

  test('"Fitness" category filter is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('button', { name: 'Fitness' })).toBeVisible()
  })

  test('"Activities" category filter is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('button', { name: 'Activities' })).toBeVisible()
  })

  test('"Online" category filter is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('button', { name: 'Online' })).toBeVisible()
  })

  test('"Services" category filter is present', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await expect(page.getByRole('button', { name: 'Services' })).toBeVisible()
  })

  test('renders at least three deal cards from /api/deals', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await page.waitForTimeout(1000)
    expect(await page.getByRole('listitem').count()).toBeGreaterThanOrEqual(3)
  })

  test('clicking a deal card navigates to /deals/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/deals')
    await page.waitForTimeout(800)
    await page.locator('a[href^="/deals/"]').first().click()
    await expect(page).toHaveURL(/\/deals\/[a-f0-9-]{8,}/)
  })

  test('page-load fetches /api/deals', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/deals')
      await page.waitForTimeout(1200)
    })
    const calls = reqs.filter((r) => /\/api\/deals(\?|$)/.test(r.url) && r.method === 'GET')
    expect(calls.length, 'GET /api/deals fired').toBeGreaterThan(0)
    expect(
      calls.every((r) => r.status === 200),
      'deals returned 200',
    ).toBe(true)
  })
})
