import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { signup } from './_helpers.js'

test('plan-updated page renders the confirmation', async ({ page }) => {
  const { accessToken } = await signup(page)
  expect(accessToken).toBeTruthy()
  await page.goto('/plan-updated')
  await expect(page.getByText(/your plan has been updated/i)).toBeVisible()
  await expect(page.getByRole('link', { name: /return home/i })).toBeVisible()
})
