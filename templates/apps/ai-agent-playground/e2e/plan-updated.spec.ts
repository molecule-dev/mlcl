import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Plan updated confirmation page', () => {
  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders confirmation copy and "Return home" affordance for authed users', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/Return home/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('"Return home" affordance navigates back to / (landing)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page
      .getByText(/Return home/i)
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10000 })
  })
})
