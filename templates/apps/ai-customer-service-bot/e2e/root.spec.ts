import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/', () => {
  test('renders the landing page container', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('[data-mol-id="page-landing"]')).toBeVisible({ timeout: 10_000 })
  })

  test('logo links back to /', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const logo = page.locator('[data-mol-id="landing-logo"]')
    await expect(logo).toHaveAttribute('href', '/')
  })

  test('header Sign-in link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('[data-mol-id="landing-signin"]').click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('header Start-free link goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('[data-mol-id="landing-signup"]').click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('hero primary CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('[data-mol-id="landing-cta-primary"]').click()
    await expect(page).toHaveURL(/\/signup/)
  })
})
