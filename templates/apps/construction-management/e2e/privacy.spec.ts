import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('privacy page renders the legal shell', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.getByText(/privacy policy/i).first()).toBeVisible()
})
