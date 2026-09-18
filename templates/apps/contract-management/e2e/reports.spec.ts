/**
 * /reports — page renders with KPI summary; loads computed report data.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('reports', () => {
  test('renders heading and loads', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/reports')
    await expect(page.getByRole('heading', { name: /Reports/i })).toBeVisible()
  })
})
