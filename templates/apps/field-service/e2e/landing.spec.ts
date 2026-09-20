import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

test.describe('landing page', () => {
  test('landing page renders with expected primary CTAs', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Hero CTAs
    await expect(page.getByRole('link', { name: /get a demo/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('"Get a demo" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /get a demo/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
