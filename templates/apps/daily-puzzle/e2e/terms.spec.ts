import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/terms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
  })

  test('renders the terms main landmark', async ({ page }) => {
    await expect(page.getByTestId('terms-page')).toBeVisible()
  })

  test('renders the H1 "Terms of service"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: /terms of service/i })).toBeVisible()
  })

  test('renders the H2 "Your account"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: /your account/i })).toBeVisible()
  })

  test('renders the H2 "Billing"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: /^billing$/i })).toBeVisible()
  })

  test('renders the H2 "Acceptable use"', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: /acceptable use/i })).toBeVisible()
  })

  test('back-to-home link navigates to /', async ({ page }) => {
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL(APP_BASE + '/')
  })

  test('does not call /api/* (static page) — gate-12 captureNetwork sentinel', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.reload()
      await page.waitForLoadState('networkidle')
    })
    expect(reqs.filter((r) => r.url.includes('/api/'))).toEqual([])
  })
})
