import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    const inputs = page.locator('input[type="password"]')
    await expect(inputs.first()).toBeVisible()
    await inputs.first().fill('NewPass123!')
    await expect(inputs.first()).toHaveValue('NewPass123!')
  })

  test('mismatched confirm shows error / no submit success', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    const inputs = page.locator('input[type="password"]')
    await inputs.first().fill('NewPass123!')
    await inputs.last().fill('Different456!')
    await page
      .getByRole('button', { name: /reset|update/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('valid submit POSTs /api/users/reset-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token&email=demo@example.com')
    // Fill email if not pre-populated.
    const emailInput = page.locator('#email')
    if ((await emailInput.inputValue()) === '') {
      await emailInput.fill('demo@example.com')
    }
    const inputs = page.locator('input[type="password"]')
    await inputs.first().fill('NewPass123!')
    await inputs.last().fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|update/i })
        .first()
        .click()
      await page.waitForTimeout(2500)
    })
    const post = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(post, 'POST /api/users/reset-password fired').toBeTruthy()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=demo-token')
    await page
      .getByRole('link', { name: /sign\s*in|back.*sign|log\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
