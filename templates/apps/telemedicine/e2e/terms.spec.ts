import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms — Terms of Service (public)', () => {
  test('renders heading + four substantive sections', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { level: 1, name: /terms of service/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /eligibility/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /scope of care/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /billing.*refunds/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^contact$/i })).toBeVisible()
  })

  test('Mentions emergency-call guidance and the legal contact email', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('main')).toContainText(/911|emergency room/i)
    await expect(page.locator('main')).toContainText(/legal@solace\.health/)
  })

  test('Page renders unauthenticated and exposes brand name in body copy', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page).toHaveURL(/\/terms$/)
    await expect(page.locator('main')).toContainText(/Solace/)
  })
})
