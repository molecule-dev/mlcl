import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/: public landing page', () => {
  test('renders the marketing hero heading', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
  })

  test('"Get started" CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', { name: /get started/i }).first()
    await cta.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /^sign in$/i }).first()
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })
})
