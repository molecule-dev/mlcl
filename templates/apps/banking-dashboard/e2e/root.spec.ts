/**
 * / — public landing page. Static, no /api calls; verifies header
 * navigation + hero + feature grid + footer.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('landing page', () => {
  test('renders nav, hero h1, sample balance card, feature grid, footer — no /api calls', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.locator('nav').first()).toBeVisible()
      await expect(page.locator('h1').first()).toBeVisible()
      await expect(page.getByText(/Total Balance/i).first()).toBeVisible()
      await expect(
        page.getByText(/Money in motion, always clear|Unified accounts/i).first(),
      ).toBeVisible()
      await expect(page.getByText(/Member FDIC/i)).toBeVisible()
    })
    const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
    expect(apiCalls, JSON.stringify(apiCalls)).toEqual([])
  })

  test('top-nav "Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#email')).toBeVisible()
  })

  test('top-nav "Open an account" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /open an account/i })
      .first()
      .click()
    await page.waitForURL('**/signup', { timeout: 5000 })
    await expect(page.locator('input#email')).toBeVisible()
  })

  test('feature grid renders all 4 cards', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /Unified accounts/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Instant transfers/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Intelligent insights/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /Audit-grade security/i })).toBeVisible()
  })

  test('bottom CTA strip also navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const ctas = page.getByRole('link', { name: /open an account/i })
    await ctas.last().click()
    await page.waitForURL('**/signup', { timeout: 5000 })
  })

  test('hero subheading renders without placeholder copy', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const subheading = page.getByText(/architectural ledger for modern institutions/i).first()
    await expect(subheading).toBeVisible()
    await expect(subheading).not.toContainText(/Lorem ipsum|placeholder|TBD/i)
  })

  test('sample balance card renders mock total + sparkline svg', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText('$12,450,000.00')).toBeVisible()
    expect(await page.locator('section svg').count()).toBeGreaterThanOrEqual(1)
  })

  test('footer copyright renders the brand', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const footer = page.locator('footer')
    await expect(footer).toContainText(/Member FDIC/i)
  })
})
