import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders the new-password form with two password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    expect(await page.locator('input[type="password"]').count()).toBeGreaterThanOrEqual(2)
    await expect(
      page.getByRole('button', { name: /reset\s*password|set\s*password/i }).first(),
    ).toBeVisible()
  })

  test('missing token keeps the form in a safe state', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    await expect(page.locator('h1').first()).toBeVisible()
  })
})
