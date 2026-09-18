import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('Start free CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /start free|sign up/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Sign in nav link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Brand wordmark stays on /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // SafeLink rewrites to="/" → href="#top" when already on /, so the brand
    // anchor's href is `/#top` (or `#top`). Match by accessible name instead.
    const brand = page.locator('nav').getByRole('link', { name: /Nosh/ }).first()
    await brand.click()
    await page.waitForLoadState('domcontentloaded')
    // Assert pathname is still / (the hash fragment is fine).
    expect(new URL(page.url()).pathname).toBe('/')
  })

  test('Three feature cards render in the features grid', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByText(/Macro tracking/i)).toBeVisible()
    await expect(page.getByText(/Barcode scanner/i)).toBeVisible()
    await expect(page.getByText(/Recipe builder/i)).toBeVisible()
  })
})
