import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy (public privacy policy)', () => {
  test('renders the privacy policy hero heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /privacy policy/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('shows a last-updated date stamp under the title', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByText(/last updated/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('"What we collect" section heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /what we collect/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Subprocessors" section heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /subprocessors/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('"Deleting your data" section heading is rendered', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /deleting your data/i }).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('back-to-home link returns to the landing route', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
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

  test('renders without auth and the page-privacy data-mol-id is attached', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible({ timeout: 10_000 })
  })
})
