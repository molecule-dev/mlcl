import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test.describe('root / landing page', () => {
  test('renders the public landing page on /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 })
    // Brand mark + tagline
    await expect(page.getByText(/Locus/i).first()).toBeVisible()
    // Eyebrow text used by the hero
    await expect(page.getByText(/Inventory · Operations · Truth/i)).toBeVisible()
  })

  test('CTAs link to /signup and /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('a[href="/signup"]').first()).toBeVisible()
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
  })

  test('"Sign in" header link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="/login"]').first().click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Start free" header link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="/signup"]').first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('feature cards render the three rails of inventory truth', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/SKU truth across every site/i)).toBeVisible()
    await expect(page.getByText(/Scan-first floor flow/i)).toBeVisible()
    await expect(page.getByText(/Forecasts that earn their keep/i)).toBeVisible()
  })

  test('proof section renders the four social-proof metrics', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // The section header
    await expect(page.getByText(/Across the Locus network/i)).toBeVisible()
    await expect(page.getByText('128', { exact: true })).toBeVisible()
    await expect(page.getByText('42M', { exact: true })).toBeVisible()
    await expect(page.getByText('99.7%', { exact: true })).toBeVisible()
  })

  test('hero KPI demo card renders with stable demo data', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Demo KPI cards are present
    await expect(page.getByText(/Low-stock SKUs/i)).toBeVisible()
    await expect(page.getByText(/Inbound today/i)).toBeVisible()
  })

  test('theme toggle in dashboard topbar persists across reloads', async ({ page }) => {
    await signup(page, uniqueEmail('theme'))
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByRole('heading', { name: /today across the fleet/i })).toBeVisible({
      timeout: 15_000,
    })
    const toggle = page.getByTestId('theme-toggle')
    await expect(toggle).toBeVisible({ timeout: 5_000 })
    const before = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    await toggle.click()
    await page.waitForTimeout(120)
    const after = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    expect(after, 'theme written to localStorage on toggle').toBeTruthy()
    expect(after).not.toBe(before)
    await page.reload()
    await expect(page.getByRole('heading', { name: /today across the fleet/i })).toBeVisible({
      timeout: 15_000,
    })
    const afterReload = await page.evaluate(() => window.localStorage.getItem('molecule-theme'))
    expect(afterReload).toBe(after)
  })

  test('logged-out user navigating to /dashboard is redirected back to /login', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/dashboard')
      await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: 10_000 })
    })
    // No protected API call should succeed for an unauthenticated visitor —
    // every /api/* response is either 401 or never fires.
    const protectedHits = reqs.filter((r) =>
      /\/api\/(?!users\/log-in|users\/forgot-password|users\/reset-password|billing\/tiers)/.test(
        r.url,
      ),
    )
    expect(protectedHits.every((r) => r.status === 401 || r.status >= 400)).toBeTruthy()
  })
})
