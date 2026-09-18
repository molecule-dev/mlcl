import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('Landing page renders the marketing hero heading', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10_000 })
  })

  test('`Get started` CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', {
        name: /get started|sign up|create account|start free|try (it )?free|start now/i,
      })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })

  test('`Log in` nav link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^log\s*in$|^sign\s*in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('Pricing nav link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^pricing$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing/, { timeout: 10_000 })
  })
})
