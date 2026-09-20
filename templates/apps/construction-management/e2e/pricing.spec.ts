import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('pricing page renders the three-tier ladder', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/choose your/i)).toBeVisible()
  for (const tier of ['Free', 'Pro', 'Team']) {
    await expect(page.getByText(tier, { exact: true }).first()).toBeVisible()
  }
})

test('pricing page lists construction limits', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByText(/punch-list items/i).first()).toBeVisible()
  await expect(page.getByText(/RFIs/i).first()).toBeVisible()
  await expect(page.getByText(/daily-log retention/i).first()).toBeVisible()
})
