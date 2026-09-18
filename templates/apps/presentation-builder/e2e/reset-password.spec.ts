/**
 * /reset-password — set a new password from a token in the URL.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('reset-password: page renders a password input', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await expect(page.locator('input[type="password"]').first()).toBeVisible({ timeout: 10_000 })
})

test('reset-password: a submit button is present', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  await expect(page.getByRole('button').first()).toBeVisible()
})

test('reset-password: a back-to-login control is reachable', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password')
  // What was wrong: `page.goto()` resolves on the `load` event, but this is a Vite
  // SPA whose `#root` is still empty at that instant — React paints ~150-200ms
  // later. `count()` is a one-shot read with NO auto-waiting, so both counts
  // sampled the pre-paint DOM and summed to 0. Measured on this page: 0 matches at
  // `goto`, 2 once painted. `.or()` keeps the same "a link OR a back-ish button"
  // union while `expect(...).toBeVisible()` retries until it is really there.
  const backToLogin = page
    .locator('a[href="/login"]')
    .or(page.getByRole('button', { name: /back|cancel|log\s*in/i }))
  await expect(backToLogin.first()).toBeVisible()
})

test('reset-password: submitting attempts POST /api/users/password (or rejects without token)', async ({
  page,
}) => {
  // Provide email + token in the URL so the form passes its required fields
  // and only the password input needs typing.
  await page.goto(APP_BASE + '/reset-password?token=fake-token&email=test%40example.com')
  const reqs = await captureNetwork(page, async () => {
    // Fill all required fields. The page renders email + token + password
    // (token rendered as a password input so it is masked).
    //
    // What was wrong: every `count()` below is a one-shot read with NO
    // auto-waiting, and `page.goto()` resolves on the `load` event while this
    // Vite SPA's `#root` is still empty (React paints ~150-200ms later). On a
    // slow pass the counts came back 0, nothing was filled, and the subsequent
    // `click()` — which DOES auto-wait, so it landed on a painted but empty
    // form — was swallowed by HTML5 required-field validation, so no request
    // ever fired. Wait for the form to paint before taking any count.
    const pwInputs = page.locator('input[type="password"]')
    await expect(pwInputs.first()).toBeVisible()
    const emails = page.locator('input[type="email"]')
    if (await emails.count()) {
      await emails.first().fill('test@example.com')
    }
    const pwCount = await pwInputs.count()
    // Token input (if present) is the first password input; the actual
    // new-password input is the next one. Fill all of them so submit
    // doesn't get blocked by HTML5 required-field validation.
    for (let i = 0; i < pwCount; i += 1) {
      await pwInputs.nth(i).fill(i === pwCount - 1 ? 'NewPass123!' : 'fake-token')
    }
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
  })
  expect(
    reqs.find(
      (r) =>
        (r.method === 'POST' || r.method === 'PUT' || r.method === 'PATCH') &&
        /\/api\/(users|auth)\/(password|reset-password|password\/reset)/.test(r.url),
    ),
    'POST/PUT/PATCH to a /api/users password-reset endpoint must fire on submit',
  ).toBeTruthy()
})
