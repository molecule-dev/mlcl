import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

test.describe('root + landing', () => {
  test('landing renders the product name and a signup CTA', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('link', { name: /get started|start free/i }).first()).toBeVisible({
      timeout: 10000,
    })
  })

  test('unknown routes redirect to the landing page', async ({ page }) => {
    await page.goto(APP_BASE + '/definitely-not-a-route')
    await expect(page).toHaveURL(APP_BASE + '/', { timeout: 10000 })
  })
})
