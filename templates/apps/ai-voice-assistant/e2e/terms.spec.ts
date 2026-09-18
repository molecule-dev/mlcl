import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms (public terms of service)', () => {
  test('renders the terms-of-service hero heading', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /terms of service/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('shows a last-updated date stamp under the title', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByText(/last updated/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('"Your account" section heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /your account/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Acceptable use" section heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /acceptable use/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Billing" section heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /^billing$/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('back-to-home link returns to the landing route', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page
      .getByRole('link', { name: /back to home/i })
      .first()
      .click()
    await expect(page).toHaveURL(
      new RegExp(`^${APP_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/?$`),
      {
        timeout: 10_000,
      },
    )
  })

  test('renders without auth and the page-terms data-mol-id is attached', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible({ timeout: 10_000 })
  })
})
