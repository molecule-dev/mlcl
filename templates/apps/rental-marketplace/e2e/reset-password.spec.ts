/**
 * /reset-password — confirm a password reset.
 *
 * Real outcomes asserted:
 *   - the form renders the new + confirm password fields
 *   - mismatched passwords surface an inline error and skip the API
 *   - posting to the reset endpoint with an invalid token shows the
 *     server-rejection error
 *   - the full happy-path flow: signup → request reset (via the test-only
 *     /api/_test/last-reset-token introspection endpoint, which mints a
 *     fresh token and returns the RAW value — standing in for the email
 *     inbox; the DB stores only its sha256 hash) → submit reset form →
 *     verify redirect to /login → log in with the new password
 *     (read-after-write end-to-end)
 *
 * The introspection endpoint is fail-closed: it 404s unless the harness
 * sets ENABLE_E2E_TEST_ENDPOINTS=true (the scaffold default is OFF).
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { API_BASE, APP_BASE, captureNetwork, signup } from './_helpers'

test('reset-password page renders both password inputs', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=anything')
  await expect(page.getByRole('heading', { name: /set a new password/i })).toBeVisible()
  const pws = page.locator('input[type="password"]')
  await expect(pws).toHaveCount(2)
  await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
})

test('mismatched passwords show inline error and skip the API call', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=ignored')
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill('one-password-xx')
  await pws.nth(1).fill('different-pw-yy')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForTimeout(500)
  })
  expect(reqs.find((r) => r.url.includes('/api/users/reset-password'))).toBeUndefined()
  await expect(page.getByText(/passwords don't match/i)).toBeVisible()
})

test('invalid token surfaces a server error', async ({ page }) => {
  // The rejected reset POST (400/401 for an unknown token) surfaces as a
  // browser console resource error — allow it explicitly.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 40[01]' })
  await page.goto(APP_BASE + '/reset-password?token=clearly-not-real-token')
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill('NewPass123!')
  await pws.nth(1).fill('NewPass123!')
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForTimeout(2000)
  })
  const post = reqs.find((r) => r.url.includes('/api/users/reset-password') && r.method === 'POST')
  expect(post, 'POST /api/users/reset-password should fire').toBeTruthy()
  expect(post!.status).toBeGreaterThanOrEqual(400)
  expect(post!.status).toBeLessThan(500)
})

test('happy path: signup → request reset → submit form → log in with new password', async ({
  page,
  browser,
}) => {
  // Step 1: sign up via UI so we have a known email + password.
  const { email } = await signup(page)

  // Step 2: mint a real reset token via the test-only introspection
  // endpoint (fail-closed; enabled by the e2e harness only). The raw
  // token stands in for the emailed link — the DB never holds it.
  const probe = await page.request.get(
    `${API_BASE}/_test/last-reset-token?email=${encodeURIComponent(email)}`,
  )
  expect(probe.ok(), `/_test/last-reset-token → ${probe.status()}`).toBe(true)
  const token = ((await probe.json()) as { token?: string }).token
  expect(token, 'expected a raw reset token').toBeTruthy()
  expect(token!.length).toBeGreaterThan(8)

  // Step 3: visit the reset form and submit a new password.
  const newPassword = 'BrandNewPass456!'
  await page.goto(APP_BASE + `/reset-password?token=${token}`)
  const pws = page.locator('input[type="password"]')
  await pws.nth(0).fill(newPassword)
  await pws.nth(1).fill(newPassword)
  const reqs = await captureNetwork(page, async () => {
    await page.getByRole('button', { name: /reset password/i }).click()
    await page.waitForURL(/\/login(?:[/?#].*)?$/, { timeout: 10000 })
  })
  const post = reqs.find((r) => r.url.includes('/api/users/reset-password') && r.method === 'POST')
  expect(post?.status).toBe(200)

  // Step 4: read-after-write — old password rejected, new password works.
  const fresh = await browser.newContext()
  const freshPage = await fresh.newPage()
  // Old password should fail.
  const wrong = await freshPage.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: 'TestPass123!' },
  })
  expect(wrong.ok()).toBe(false)
  // New password should succeed.
  const right = await freshPage.request.post(`${API_BASE}/users/log-in`, {
    data: { email, password: newPassword },
  })
  expect(right.ok()).toBe(true)
  await fresh.close()
})
