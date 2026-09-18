import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders the pricing page', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/pricing|plans|free|pro/i).first()).toBeVisible()
  })

  test('shows Free plan card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/free/i).first()).toBeVisible()
  })

  test('shows Pro plan card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/pro/i).first()).toBeVisible()
  })

  test('shows Team plan card', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByText(/team/i).first()).toBeVisible()
  })

  test('plan CTA button or link is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // PricingPage renders one CTA per tier — anonymous visitors get either a
    // disabled "Current plan" (free) or "Upgrade to {tier}" button. Both are
    // visible — assert at least one rendered, and that it's interactive (not
    // just text).
    const cta = page.getByRole('button', { name: /upgrade|current/i }).first()
    await expect(cta).toBeVisible({ timeout: 15_000 })
  })
})
