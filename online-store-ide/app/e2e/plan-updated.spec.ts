import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated', () => {
  test('renders the post-checkout confirmation for a signed-in user', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/your plan has been updated|thank you/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible()
  })
})
