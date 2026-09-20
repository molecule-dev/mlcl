import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('about page renders construction feature pillars', async ({ page }) => {
  await page.goto(APP_BASE + '/about')
  await expect(page.getByRole('heading', { name: /daily logs/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /punch lists/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /RFIs/i }).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: /subcontractors/i }).first()).toBeVisible()
})
