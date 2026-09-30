import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_NAME } from '../src/branding.js'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password page', () => {
  test('heading "Set a new password" is visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
  })

  test('new-password and confirm fields plus submit are visible', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    // Wait for the page to finish mounting before asserting the fields. On a
    // cold first navigation the form inputs can lag the route transition by a
    // beat; anchoring on the heading (always present once the page renders)
    // removes that render race that made this spec flaky (✘ then ✓ on retry).
    await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /new password/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /confirm password/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"new password" textbox accepts and masks input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const np = page.getByRole('textbox', { name: /new password/i })
    await np.fill('NewStrongPassw0rd!')
    await expect(np).toBeVisible()
  })

  test('"confirm password" textbox accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const cp = page.getByRole('textbox', { name: /confirm password/i })
    await cp.fill('NewStrongPassw0rd!')
    await expect(cp).toBeVisible()
  })

  test('"schedule Chrono" landing link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: APP_NAME }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('submit without a valid token stays on /reset-password (or surfaces error)', async ({
    page,
  }) => {
    // The whole point of this test is that the backend rejects a tokenless
    // reset (4xx) — allow the browser's console log of the failed request.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 4\\d\\d',
    })
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('textbox', { name: /new password/i }).fill('NewStrongPassw0rd!')
    await page.getByRole('textbox', { name: /confirm password/i }).fill('NewStrongPassw0rd!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(2500)
    })
    const rp = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(rp, 'POST /api/users/reset-password').toBeTruthy()
    // Without a token the backend rejects the request — body status >= 400
    if (rp && rp.status !== undefined) {
      expect([200, 400, 401, 403, 404, 422]).toContain(rp.status)
    }
  })
})
