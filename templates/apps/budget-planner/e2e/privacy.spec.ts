import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Privacy page renders the heading', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.getByRole('heading', { name: /^privacy$/i })).toBeVisible()
})
