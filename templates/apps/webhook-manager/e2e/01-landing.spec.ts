import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers'

test.describe('/', () => {
  test('renders the Relay landing page', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByText(/Relay/i).first()).toBeVisible()
  })

  test('"Start free" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })

  test('"Sign in" navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('pricing cards reference each tier name', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Was: `await page.getByText(/Free|Pro|Team/i).first().isVisible()`, which was
    // wrong twice over. (1) isVisible() is a one-shot read with NO auto-waiting, so
    // after a goto (which resolves on 'load', before React paints in this Vite dev
    // SPA) it returned false. (2) `.first()` landed on the header "Start free" CTA —
    // never a pricing card — so even when it passed it asserted nothing about pricing.
    // Now each card is scoped by its own data-mol-id and asserted with auto-waiting
    // toBeVisible(), so ALL THREE tiers must really render, with the monthly price
    // that mirrors api/src/tiers.ts (Free $0 / Pro $15 / Team $49).
    const tiers = [
      { tier: 'free', price: '$0' },
      { tier: 'pro', price: '$15' },
      { tier: 'team', price: '$49' },
    ] as const
    for (const { tier, price } of tiers) {
      const card = page.locator(`[data-mol-id="landing-pricing-${tier}"]`)
      await expect(card).toBeVisible({ timeout: 10_000 })
      await expect(card.getByText(new RegExp(`^${tier}$`, 'i'))).toBeVisible()
      await expect(card).toContainText(price)
    }
  })
})
