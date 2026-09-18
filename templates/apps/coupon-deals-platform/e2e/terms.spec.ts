import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('Terms page (/terms)', () => {
  test('renders the page title', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /terms of service/i, level: 1 })).toBeVisible()
  })

  test('"Back to Snagr" link returns to /', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.getByRole('link', { name: /back to snagr/i }).click()
    await expect(page).toHaveURL(/^http:\/\/[^/]+\/?$/)
  })

  test('renders the "Your account" section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /your account/i, level: 2 })).toBeVisible()
  })

  test('renders the "Saving and redeeming coupons" section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(
      page.getByRole('heading', { name: /saving and redeeming coupons/i, level: 2 }),
    ).toBeVisible()
  })

  test('renders the "Merchant honour" section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /merchant honour/i, level: 2 })).toBeVisible()
  })

  test('renders the "Billing" section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /^billing$/i, level: 2 })).toBeVisible()
  })
})
