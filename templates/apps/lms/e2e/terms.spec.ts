import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/terms', () => {
  test('renders Terms heading at level 1', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /^Terms$/i, level: 1 })).toBeVisible()
  })

  test('shows Account responsibilities section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /account responsibilities/i })).toBeVisible()
  })

  test('shows Service availability section', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await expect(page.getByRole('heading', { name: /service availability/i })).toBeVisible()
  })
})
