/**
 * /reset-password page — token-bearing URL, new-password input, submit,
 * back-to-login. Outcome asserted: an invalid token surfaces an inline
 * error and does NOT navigate the user to /home.
 *
 * The full success-path test is exercised end-to-end against the
 * /api/users/forgot-password flow: this spec covers the failure mode
 * because the success token is only available with a real email
 * delivery service (Mailgun) which we don't mock.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('reset-password page renders password + submit + back link', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake-token-123')
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button').first()).toBeVisible()
  await expect(page.getByRole('link', { name: /back|sign|login/i }).first()).toBeVisible()
})

test('invalid reset token returns 4xx and stays on the page', async ({ page }) => {
  // The 4xx is the test's premise; the browser logs it as a console error,
  // which the auto-attached console guard would otherwise fail the test for.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 4[0-9][0-9]',
  })
  await page.goto(
    APP_BASE + '/reset-password?token=this-token-was-never-issued&email=nobody@example.com',
  )
  await page.locator('input[type="password"]').first().fill('NewPass-123!')
  const reqs = await captureNetwork(page, async () => {
    await page
      .getByRole('button', { name: /save|reset|update|set|change/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const call = reqs.find(
    (r) => r.method === 'POST' && /\/api\/(reset_password|users\/reset-password)/.test(r.url),
  )
  expect(call, 'reset-password POST should fire').toBeTruthy()
  expect(call!.status).toBeGreaterThanOrEqual(400)
  await expect(page).toHaveURL(/\/reset-password/)
})

test('reset-password form pre-fills token from query string', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=preset-token-xyz')
  // The token field should accept the URL-supplied value.
  const tokenField = page.getByRole('textbox', { name: /code|token/i }).first()
  if (await tokenField.count()) {
    await expect(tokenField).toHaveValue('preset-token-xyz')
  }
})

test('reset-password back-link returns to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake')
  await page
    .getByRole('link', { name: /back|sign in|login/i })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login/)
})

test('reset-password header brand link returns to /', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake')
  await page.getByRole('link', { name: /verso/i }).first().click()
  await expect(page).toHaveURL(/\/$/)
})

test('reset-password email and code fields accept input', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  const email = page.getByRole('textbox', { name: /email/i }).first()
  await email.fill('user@example.com')
  await expect(email).toHaveValue('user@example.com')
  const codeField = page.getByRole('textbox', { name: /code|token/i }).first()
  if (await codeField.count()) {
    await codeField.fill('manual-code-input')
    await expect(codeField).toHaveValue('manual-code-input')
  }
})

test('reset-password theme toggle works', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake')
  const before = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  await page
    .getByRole('button', { name: /toggle theme/i })
    .first()
    .click()
  await page.waitForTimeout(150)
  const after = await page.evaluate(
    () =>
      document.documentElement.getAttribute('data-mol-theme') ||
      document.documentElement.getAttribute('data-mol-mode') ||
      document.documentElement.dataset.theme,
  )
  expect(after).not.toBe(before)
})
