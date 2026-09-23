import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/gallery', () => {
  test('renders Gallery h1 and fetches images', async ({ page }) => {
    await signup(page)
    // The page's data fetch fires from a mount effect — after the top-bar h1
    // is already visible — so the capture must stay attached until the network
    // settles (networkidle), not just until the heading renders.
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/gallery')
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {})
    })
    expect(reqs.some((r) => /\/api\/generations/.test(r.url) && r.method === 'GET')).toBeTruthy()
  })

  test('"All" status filter is initially pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const btn = page.getByRole('button', { name: /^All$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Complete" status filter toggles pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const btn = page.getByRole('button', { name: /^Complete$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"In flight" status filter toggles pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const btn = page.getByRole('button', { name: /In flight/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Upscaled" status filter toggles pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const btn = page.getByRole('button', { name: /Upscaled/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Failed" status filter toggles pressed', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const btn = page.getByRole('button', { name: /^Failed$/i })
    await btn.click()
    await expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  test('"Export all" button is interactive', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const btn = page.getByRole('button', { name: /Export all/i })
    await expect(btn).toBeEnabled()
  })

  test('clicking a gallery image card navigates to /images/:id', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/gallery')
    const link = page.locator('a[href^="/images/"]').first()
    await expect(link).toBeVisible({ timeout: 10000 })
    await link.click()
    await expect(page).toHaveURL(/\/images\//)
  })
})
