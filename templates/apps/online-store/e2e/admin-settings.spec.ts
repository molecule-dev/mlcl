import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, promoteToAdmin, signup } from './_helpers.js'

test.describe('/admin/settings', () => {
  test('renders the store-settings shell for an authed admin', async ({ page }) => {
    await signup(page)
    // /api/admin/* is gated behind requireAdmin — the store-settings shell
    // only loads real values for an operator account.
    await promoteToAdmin(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/admin/settings')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(reqs.length).toBeGreaterThan(0)
    await expect(page.getByRole('heading', { name: /store settings/i })).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('heading', { name: /general settings/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /payment settings/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /shipping settings/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /email notifications/i })).toBeVisible()
  })

  test('admin sidebar navigation is consistent across admin sub-pages', async ({ page }) => {
    await signup(page)
    await promoteToAdmin(page)
    await page.goto(APP_BASE + '/admin/settings')
    // Sidebar links point at the four admin routes that actually exist.
    for (const href of ['/admin', '/admin/products', '/admin/orders', '/admin/settings']) {
      await expect(page.locator(`a[href="${href}"]`)).toBeVisible()
    }
  })

  // The settings toggles are the shared @molecule Switch (role="switch" +
  // aria-checked), not hand-rolled buttons — assert the REAL interaction:
  // a click flips aria-checked through the native change event.
  test('settings switches flip aria-checked on click', async ({ page }) => {
    await signup(page)
    await promoteToAdmin(page)
    await page.goto(APP_BASE + '/admin/settings')
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})

    const stripe = page.locator('[data-mol-id="toggle-stripe"]')
    await expect(stripe).toBeVisible({ timeout: 15_000 })
    const stripeBefore = (await stripe.getAttribute('aria-checked')) === 'true'
    await stripe.click()
    await expect(stripe).toHaveAttribute('aria-checked', stripeBefore ? 'false' : 'true')
    await stripe.click()
    await expect(stripe).toHaveAttribute('aria-checked', stripeBefore ? 'true' : 'false')

    const marketing = page.locator('[data-mol-id="notif-marketing"]')
    await expect(marketing).toBeVisible()
    const marketingBefore = (await marketing.getAttribute('aria-checked')) === 'true'
    await marketing.click()
    await expect(marketing).toHaveAttribute('aria-checked', marketingBefore ? 'false' : 'true')
  })
})
