import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

// /reset-password: email + reset token + new password. Submitting calls
// confirmReset on the auth bond which POSTs to /api/users/resetPassword
// (the api/users handler). With a bogus token the call returns 4xx and
// the error message renders.

test.describe('/reset-password', () => {
  test('email field is editable', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#email').fill('me@example.com')
    await expect(page.locator('#email')).toHaveValue('me@example.com')
  })

  test('reset-token field is editable', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#token').fill('abc123token')
    await expect(page.locator('#token')).toHaveValue('abc123token')
  })

  test('submit fires POST to /api/users (confirm-reset endpoint)', async ({ page }) => {
    // The confirm-reset endpoint answers a bogus token with 401 by contract;
    // the browser logs the failed fetch and the console guard would fail the
    // test for exactly the behavior this spec asserts.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('#email').fill('test@example.com')
    await page.locator('#token').fill('definitely-not-a-real-token')
    await page.locator('#password').fill('NewSecure9!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      // POST will return 4xx; an error alert renders OR the form stays
      // — either way, the network request must have fired.
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => /\/api\/users\b/.test(r.url) && r.method === 'POST')
    expect(post, 'POST to confirm-reset endpoint should fire').toBeTruthy()
  })
})
