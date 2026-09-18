import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers'

test.describe('/ (landing)', () => {
  test('renders hero copy and a sign-in entry point', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('"start a trial" CTA links to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start a trial|start a free trial|get started/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"sign in" link in nav goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
