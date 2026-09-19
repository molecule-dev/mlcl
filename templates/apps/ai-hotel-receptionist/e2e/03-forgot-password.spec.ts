import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('accepts an email and shows the sent notice', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('#email').fill('desk@example.com')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Send reset link/i }).click()
      await page
        .getByText(/reset link is on its way/i)
        .waitFor({ state: 'visible', timeout: 20000 })
    })
    const reset = reqs.find(
      (r) => r.method === 'POST' && /\/api\/users\/forgot-password/.test(r.url),
    )
    expect(reset, 'POST /api/users/forgot-password must fire').toBeDefined()
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })
})
