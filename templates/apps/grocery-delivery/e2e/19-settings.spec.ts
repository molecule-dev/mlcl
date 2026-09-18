import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork, signup } from './_helpers'

// /settings — authenticated. Sections: profile (PATCH /api/users/:id),
// addresses (display), payments (display), preferences (localStorage).

test.describe('/settings', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto(APP_BASE + '/settings')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('renders profile, addresses, payments, preferences sections', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await expect(page.locator('[data-test="settings-section-profile"]')).toBeVisible()
    await expect(page.locator('[data-test="settings-section-addresses"]')).toBeVisible()
    await expect(page.locator('[data-test="settings-section-payments"]')).toBeVisible()
    await expect(page.locator('[data-test="settings-section-preferences"]')).toBeVisible()
  })

  test('updating profile name PATCHes /api/users/:id and shows saved status', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test="settings-name-input"]').fill('Updated Name')
    // Pre-register the response listener BEFORE clicking so a fast
    // round-trip doesn't race past the wait.
    const respP = page.waitForResponse(
      (r) =>
        /\/api\/users\//.test(r.url()) &&
        (r.request().method() === 'PATCH' || r.request().method() === 'PUT'),
      { timeout: 15_000 },
    )
    const reqs = await captureNetwork(page, async () => {
      await page.locator('[data-test="settings-save"]').click()
      await respP
    })
    const patch = reqs.find(
      (r) => /\/api\/users\//.test(r.url) && (r.method === 'PATCH' || r.method === 'PUT'),
    )
    expect(patch).toBeDefined()
    expect(patch!.status).toBeLessThan(300)
    await expect(page.locator('[data-test="settings-saved"]')).toBeVisible({ timeout: 10_000 })
  })

  test('switching to Addresses section shows the saved-addresses list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test="settings-section-addresses"]').click()
    await expect(page.getByRole('heading', { name: /saved addresses/i })).toBeVisible()
  })

  test('switching to Payments section shows the payment-methods list', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test="settings-section-payments"]').click()
    await expect(page.getByRole('heading', { name: /payment methods/i })).toBeVisible()
  })

  test('toggling push notification preference persists to localStorage and survives reload', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test="settings-section-preferences"]').click()
    const toggle = page.locator('[data-test="settings-push-toggle"]')
    await expect(toggle).toBeVisible()
    // Defaults to push=true; click flips to false
    await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 })
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 5_000 })
    // Saved-toast confirms the persist completed before reload
    await expect(page.locator('[data-test="settings-prefs-saved"]')).toBeVisible({ timeout: 5_000 })
    await page.reload()
    await page.locator('[data-test="settings-section-preferences"]').click()
    await expect(page.locator('[data-test="settings-push-toggle"]')).toHaveAttribute(
      'aria-checked',
      'false',
      { timeout: 5_000 },
    )
  })

  test('changing default substitution preference persists to localStorage', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/settings')
    await page.locator('[data-test="settings-section-preferences"]').click()
    await page.locator('[data-test="settings-sub-default"]').selectOption('refund')
    await expect(page.locator('[data-test="settings-prefs-saved"]')).toBeVisible({ timeout: 5_000 })
    await page.reload()
    await page.locator('[data-test="settings-section-preferences"]').click()
    await expect(page.locator('[data-test="settings-sub-default"]')).toHaveValue('refund', {
      timeout: 5_000,
    })
  })
})
