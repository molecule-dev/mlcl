import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, flipThemeAndAssertChanged, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
  })

  test('renders the brand link with "Sparq home" aria-label', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sparq home/i })).toBeVisible()
  })

  test('toggle theme button flips html data-theme', async ({ page }) => {
    await flipThemeAndAssertChanged(page)
  })

  test('email input accepts text', async ({ page }) => {
    await page.locator('input[type="email"]').first().fill('me@example.com')
    expect(await page.locator('input[type="email"]').first().inputValue()).toBe('me@example.com')
  })

  test('submit POSTs to backend reset request and shows "Check your inbox" success card', async ({
    page,
  }) => {
    const email = uniqueEmail('forgot')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type="email"]').first().fill(email)
      await page.getByRole('button', { name: /send reset link/i }).click()
      await page.waitForLoadState('networkidle')
    })
    // Backend mounts the request endpoint via the user resource — both potential paths accepted.
    const reset = reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users\/password-reset\/request|\/api\/users\/forgot-password|\/api\/users\/reset-password\/request/.test(
          r.url,
        ),
    )
    expect(reset, 'POST password-reset/request').toBeTruthy()
    expect(reset?.status).toBeLessThan(400)
    await expect(page.getByText(/check your inbox/i)).toBeVisible()
    // Email value interpolated into the success card body. Escape regex meta-chars
    // (the email contains a "+" character) before building the literal RegExp.
    const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    await expect(page.getByText(new RegExp(escaped))).toBeVisible()
  })

  test('"Back to sign in" link → /login', async ({ page }) => {
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Privacy footer link → /privacy', async ({ page }) => {
    await page
      .getByRole('link', { name: /privacy/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/privacy$/)
  })

  test('Terms footer link → /terms', async ({ page }) => {
    await page.getByRole('link', { name: /terms/i }).first().click()
    await expect(page).toHaveURL(/\/terms$/)
  })

  test('Language switcher button present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /language/i }).first()).toBeVisible()
  })
})
