import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/pricing', () => {
  test('page heading renders after /api/billing/tiers resolves', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(
      page.getByRole('heading', { name: /Choose your .* plan/i, level: 1 }),
    ).toBeVisible()
  })

  test('free tier card renders with $0 price + Free label', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const card = page.locator('[data-mol-id="pricing-tier-free"]')
    await expect(card).toBeVisible()
    await expect(card).toContainText(/\$0/i)
    await expect(card).toContainText(/Free/i)
  })

  test('Pro tier card renders with $15 monthly price', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const card = page.locator('[data-mol-id="pricing-tier-pro"]')
    await expect(card).toBeVisible()
    await expect(card).toContainText(/\$15/i)
  })

  test('Team tier card renders with $49 monthly price', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const card = page.locator('[data-mol-id="pricing-tier-team"]')
    await expect(card).toBeVisible()
    await expect(card).toContainText(/\$49/i)
  })

  test('Pro CTA is enabled with an "Upgrade" label when Stripe price IDs are wired', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    const cta = page.locator('[data-mol-id="pricing-cta-pro"]').first()
    await expect(cta).toBeVisible()
    // Smoke env wires real Stripe test prices, so the CTA should be enabled.
    await expect(cta).toBeEnabled()
    await expect(cta).toContainText(/upgrade/i)
  })

  test('Team CTA is enabled with an "Upgrade" label when Stripe price IDs are wired', async ({
    page,
  }) => {
    await page.goto(APP_BASE + '/pricing')
    const cta = page.locator('[data-mol-id="pricing-cta-team"]').first()
    await expect(cta).toBeVisible()
    await expect(cta).toBeEnabled()
    await expect(cta).toContainText(/upgrade/i)
  })

  test('Free CTA stays in "Current plan" disabled state', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    const cta = page.locator('[data-mol-id="pricing-cta-free"]').first()
    await expect(cta).toBeVisible()
    await expect(cta).toBeDisabled()
  })

  test('GET /api/billing/tiers fires on page load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    expect(
      reqs.some(
        (r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url) && r.status === 200,
      ),
      'GET /api/billing/tiers must succeed',
    ).toBeTruthy()
  })
})
