import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers'

test.describe('/ landing', () => {
  test('renders hero + primary CTAs without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /start.*trial|get a demo|sign.*up/i }).first(),
    ).toBeVisible()
  })

  test('"Sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Start trial / Sign up" CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start.*trial|get a demo|sign.*up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('feature deck mentions Upload', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/upload/i).first()).toBeVisible()
  })
})
