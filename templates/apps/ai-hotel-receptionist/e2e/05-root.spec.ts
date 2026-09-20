import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ (landing)', () => {
  test('renders the multilingual voice pitch with language chips', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(/in the guest.s own language/i).first()).toBeVisible()
    // The hero chips name the seeded agent languages — structural: 6 chips.
    await expect(
      page.getByRole('list', { name: /languages the voice agent speaks/i }),
    ).toBeVisible()
  })

  test('primary CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Start answering in 6 languages/i }).click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('secondary CTA navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.getByRole('link', { name: /Sign in to the front desk/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('feature cards render the PMS + simulator story', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // Heading role: the hero paragraph also mentions detecting the caller's
    // language, so a bare getByText match is ambiguous (strict mode).
    await expect(page.getByRole('heading', { name: /Detects the caller/i })).toBeVisible()
    await expect(page.getByText(/Books rooms on the call/i)).toBeVisible()
    await expect(page.getByText(/A real PMS behind it/i)).toBeVisible()
    await expect(page.getByText(/Try it on the Call Simulator/i)).toBeVisible()
  })
})
