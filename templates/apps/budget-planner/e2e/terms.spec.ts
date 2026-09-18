import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('Terms page renders the heading', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByRole('heading', { name: /^terms$/i })).toBeVisible()
})
