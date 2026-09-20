import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('terms page renders the legal shell', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByText(/terms of service/i).first()).toBeVisible()
})
