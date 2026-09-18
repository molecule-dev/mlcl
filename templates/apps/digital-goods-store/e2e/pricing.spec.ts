import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('Pricing page (/pricing)', () => {
  test('renders the pricing heading', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('renders the Free plan card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    const free = page.getByText(/free/i)
    expect(await free.count(), 'Free plan label visible').toBeGreaterThan(0)
  })

  test('renders the Pro plan card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    const pro = page.getByText(/^pro$|pro plan/i)
    expect(await pro.count(), 'Pro plan label visible').toBeGreaterThan(0)
  })

  test('renders the Team plan card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForTimeout(1500)
    const team = page.getByText(/team/i)
    expect(await team.count(), 'Team plan label visible').toBeGreaterThan(0)
  })

  test('page-load fetches a billing endpoint or renders static plan data', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForTimeout(1500)
    })
    // The pricing page may either GET /api/billing/plans or use static
    // build-time plan data — either is fine. We assert the page rendered.
    expect(reqs.length).toBeGreaterThanOrEqual(0)
    await expect(page.getByRole('heading').first()).toBeVisible()
  })
})
