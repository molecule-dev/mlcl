/**
 * /forgot-password — request a password-reset email.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, uniqueEmail } from './_helpers.js'

test('forgot-password: page renders an email input', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
})

test('forgot-password: a submit button is present', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.getByRole('button').first()).toBeVisible()
})

test('forgot-password: a back-to-login control is reachable', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  // Page may render a link OR a Button that navigate('/login') — either is fine.
  //
  // What was wrong: `page.goto()` resolves on the `load` event, but this is a Vite
  // SPA whose `#root` is still empty at that instant — React paints ~150-200ms
  // later. `count()` is a one-shot read with NO auto-waiting, so both counts
  // sampled the pre-paint DOM and summed to 0. `.or()` keeps the same "a link OR a
  // back-ish button" union while `expect(...).toBeVisible()` retries until the
  // control is really there.
  const backToLogin = page
    .locator('a[href="/login"]')
    .or(page.getByRole('button', { name: /back|cancel|log\s*in/i }))
  await expect(backToLogin.first()).toBeVisible()
})

test('forgot-password: submitting fires POST /api/users/forgot-password', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="email"]').first().fill(uniqueEmail('forgot'))
    // The submit button has aria-label "Submit"; use type="submit"
    await page.locator('button[type="submit"]').first().click()
    await page.waitForTimeout(2000)
  })
  // The handler may return 2xx (sent) or 4xx (unknown email) — either way
  // the POST must fire.
  expect(
    reqs.find(
      (r) =>
        r.method === 'POST' &&
        /\/api\/users\/(forgot-password|reset-password|password-reset)/.test(r.url),
    ),
    'POST /api/users/forgot-password (or equivalent) must fire',
  ).toBeTruthy()
})
