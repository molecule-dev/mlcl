import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, whereUrl } from './_helpers.js'

test.describe('/reset-password', () => {
  test('page renders password input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=invalid-token-for-render-test')
    const pw = page.getByPlaceholder(/password/i).first()
    await pw.fill('NewPass123!')
    await expect(pw).toHaveValue('NewPass123!')
  })

  test('submitting an invalid token POSTs /api/users/reset-password and surfaces an error', async ({
    page,
  }) => {
    // An invalid token is the subject of this test — the API's 401 shows up
    // as a browser console resource error, which the console guard would
    // otherwise fail the test for.
    test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
    const url =
      APP_BASE +
      '/reset-password?email=' +
      encodeURIComponent('not-real-' + Date.now() + '@example.com') +
      '&token=' +
      encodeURIComponent('clearly-not-a-real-token-9999')
    await page.goto(url)
    // Email and token are prefilled from the query string. Just fill the
    // new password and submit.
    const inputs = page.locator('input[type="password"]')
    // Two password inputs are present: the token field and the new password
    // field. Both already have values (token is prefilled), so we set the
    // last one to be safe.
    await inputs.last().fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('button[type="submit"]').first().click()
      await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    })
    const posts = whereUrl(reqs, /\/api\/users\/reset-password/, 'POST')
    expect(posts.length, 'POST /api/users/reset-password fired').toBeGreaterThan(0)
    expect(posts[0]!.status, 'invalid token returns 4xx').toBeGreaterThanOrEqual(400)
    expect(page.url(), 'invalid token keeps user on /reset-password').toMatch(/\/reset-password/)
  })

  test('back button routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('button', { name: /go back|back|sign in|log in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login/)
  })
})
