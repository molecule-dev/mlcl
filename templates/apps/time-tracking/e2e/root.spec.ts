import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ landing page', () => {
  test('hero heading "Every second, accounted for" is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /every second, accounted for/i })).toBeVisible()
  })

  test('logo link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/login')
    await page
      .getByRole('link', { name: /chrono/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(APP_BASE + '/?$'))
  })

  test('nav "Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.locator('[data-test="login-form"]')).toBeVisible()
  })

  test('nav "Start tracking — free" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start tracking/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup$/)
    await expect(page.locator('[data-test="signup-form"]')).toBeVisible()
  })

  test('feature card heading "One-click timer" renders', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /one-click timer/i })).toBeVisible()
  })

  test('feature card heading "Projects with budgets" renders', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /projects with budgets/i })).toBeVisible()
  })

  test('feature card heading "Reports clients love" renders', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /reports clients love/i })).toBeVisible()
  })

  test('feature card heading "Invoices, automatically" renders', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { name: /invoices, automatically/i })).toBeVisible()
  })

  test('hero CTA "Start tracking — free" link navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const ctas = page.getByRole('link', { name: /start tracking/i })
    await ctas.first().click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('footer CTA "Start tracking — free" navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const ctas = page.getByRole('link', { name: /start tracking/i })
    await ctas.last().click()
    await expect(page).toHaveURL(/\/signup$/)
  })
})
