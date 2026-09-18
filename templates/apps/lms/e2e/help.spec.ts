import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/help', () => {
  test('renders Help heading at level 1', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await expect(page.getByRole('heading', { name: /^Help$/i, level: 1 })).toBeVisible()
  })

  test('shows For students section heading', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await expect(page.getByRole('heading', { name: /for students/i })).toBeVisible()
  })

  test('lists the first student-facing guidance bullet', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await expect(page.getByText(/check assignment due dates/i)).toBeVisible()
  })
})
