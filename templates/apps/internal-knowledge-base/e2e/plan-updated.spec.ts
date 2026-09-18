import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test('PlanUpdated page renders confirmation and a Return home link', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  // Use the exact "Return home" English string to avoid colliding with
  // sidebar nav "Home" links from the layout shell.
  await expect(page.getByRole('link', { name: /return home/i })).toBeVisible({ timeout: 10_000 })
})

test('PlanUpdated → Return home navigates to /', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await page.getByRole('link', { name: /return home/i }).click()
  await expect(page).not.toHaveURL(/\/plan-updated/, { timeout: 10_000 })
  // The Link points to "/", which is Landing for the public-readable case.
  await expect(page).toHaveURL(/^http:\/\/[^/]+\/$/, { timeout: 5_000 })
})

test('PlanUpdated link wraps a button (Return home CTA)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByRole('link', { name: /return home/i })).toHaveAttribute('href', '/')
  await expect(page.getByRole('button', { name: /return home/i })).toBeVisible()
})

test('PlanUpdated does NOT redirect unauthenticated visitors back to login (public-readable confirmation)', async ({
  page,
}) => {
  // Stripe sometimes drops the user back here without an active session;
  // the page must render its confirmation copy regardless.
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForTimeout(800)
  expect(page.url()).toContain('/plan-updated')
  // Confirmation heading should still be visible.
  await expect(page.getByRole('link', { name: /return home/i })).toBeVisible({ timeout: 10_000 })
})

test.describe('/plan-updated — checkout return', () => {
  test('confirms the purchase when the provider returns with a payment id', async ({ page }) => {
    await signup(page)
    const confirmed = page
      .waitForResponse((r) => /\/verify-payment\//.test(r.url()), { timeout: 20_000 })
      .catch(() => null)
    // The provider's success_url lands on the APP origin, so this page is what
    // finishes the purchase — without the call the paid plan is never granted.
    await page.goto(APP_BASE + '/plan-updated?provider=stripe&sessionId=cs_test_e2e')
    expect(await confirmed).not.toBeNull()
  })
})
