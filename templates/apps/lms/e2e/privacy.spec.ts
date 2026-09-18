import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/privacy', () => {
  test('renders Privacy heading at level 1', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /^Privacy$/i, level: 1 })).toBeVisible()
  })

  test('shows introductory paragraph about Scholar LMS', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByText(/scholar lms collects/i)).toBeVisible()
  })

  test('shows "What we collect" section', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await expect(page.getByRole('heading', { name: /what we collect/i })).toBeVisible()
  })
})
