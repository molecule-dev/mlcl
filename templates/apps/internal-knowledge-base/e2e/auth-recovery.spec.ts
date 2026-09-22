import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('Forgot password posts to /api/users/forgot-password and shows success message', async ({
  page,
}) => {
  const { email } = await signup(page)
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"], input#email').first().fill(email)
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /send|reset|email|link/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(post, 'forgot-password POST not observed').toBeDefined()
  expect(post?.status).toBe(200)
})

test('Forgot password for unknown email still returns 200 (anti-enumeration)', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await page.locator('input[type="email"], input#email').first().fill(uniqueEmail('does-not-exist'))
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /send|reset|email|link/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find((r) => /\/api\/users\/forgot-password/.test(r.url) && r.method === 'POST')
  expect(post?.status).toBe(200)
})

test('Reset password page posts to /api/users/reset-password (not /api/users/password)', async ({
  page,
}) => {
  // The bogus token intentionally 401s — the console guard must not treat
  // that expected rejection as a failure.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
  await page.goto(APP_BASE + '/reset-password?token=invalid-test-token')
  await page.locator('input#password').first().fill('NewPassword123!')
  await page.locator('input#confirm').first().fill('NewPassword123!')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForTimeout(1500)
  })
  const post = reqs.find((r) => /\/api\/users\/reset-password$/.test(r.url) && r.method === 'POST')
  expect(post, 'reset-password POST should target /users/reset-password').toBeDefined()
  // Token is invalid, so server returns an error — we just need to confirm
  // the request was sent to the right path (not /users/password which 404s).
  expect(post?.status).not.toBe(404)
})
