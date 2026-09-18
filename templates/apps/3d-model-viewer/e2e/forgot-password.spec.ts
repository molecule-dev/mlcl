import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('Page renders an email input and a submit button', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type=email]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset|submit/i }).first()).toBeVisible()
  })

  test('Submitting the form fires POST /api/users/forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input[type=email]').first().fill(uniqueEmail('forgot'))
      await page
        .getByRole('button', { name: /send|reset|submit/i })
        .first()
        .click()
      await page.waitForTimeout(2000)
    })
    const call = reqs.find(
      (r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST',
    )
    expect(call, 'POST /api/users/forgot-password fired').toBeTruthy()
    // The endpoint always returns 2xx whether the email exists or not (no
    // user enumeration); the contract is "request acknowledged".
    expect(call!.status, 'response is 2xx').toBeLessThan(300)
  })

  test('"Back to sign in" link returns to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page
      .getByRole('link', { name: /back|sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
