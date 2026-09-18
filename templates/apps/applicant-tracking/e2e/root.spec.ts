import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors } from './_helpers.js'

test.describe('landing page (/)', () => {
  test('renders the brand mark and primary headline', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('[data-mol-id="page-landing"]')).toBeVisible()
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
  })

  test('Sign in nav link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('Get-started or Start-free link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page
      .getByRole('link', { name: /get started|start free|start.*free|create.*account|sign up/i })
      .first()
    await cta.click()
    await expect(page).toHaveURL(/\/signup$/)
  })

  test('Pricing nav link routes to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /pricing/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/pricing$/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.locator('[data-mol-id="page-landing"]')).toBeVisible()
    })
  })
})
