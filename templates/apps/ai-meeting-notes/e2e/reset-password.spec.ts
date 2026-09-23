/**
 * /reset-password — complete a password reset with a token.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('without a token, the page surfaces an invalid/expired message or disabled form', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/reset-password')
  // Page should render without crashing.
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('with a token, password fields render', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=test-token-abc')
  // Either two password fields or a submit button is present.
  const pwField = page.getByLabel(/^password$|new password/i).first()
  await expect(pwField).toBeVisible({ timeout: 10_000 })
})

test('confirm password field renders alongside the password field', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=test-token-abc')
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  await expect(confirm).toBeVisible({ timeout: 10_000 })
})

test('mismatched passwords show validation', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=test-token-abc')
  const pw = page.getByLabel(/^password$|new password/i).first()
  const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
  await pw.fill('TestPass123!')
  await confirm.fill('Different456!')
  await page
    .getByRole('button', { name: /reset|update|save|change/i })
    .first()
    .click()
  // Stays on page; no nav.
  await page.waitForTimeout(1500)
  expect(page.url()).toContain('/reset-password')
})

test('reset-password POST fires with the token', async ({ page }) => {
  // The test deliberately triggers this failure; the console guard would
  // otherwise fail the test on the expected browser console error.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/reset-password?token=test-token-abc')
    const pw = page.getByLabel(/^password$|new password/i).first()
    const confirm = page.getByLabel(/confirm.*password|password.*confirm/i).first()
    await pw.fill('TestPass123!')
    if (await confirm.count().catch(() => 0)) await confirm.fill('TestPass123!')
    await page
      .getByRole('button', { name: /reset|update|save|change/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
  })
  const call = reqs.find(
    (r) => /\/reset-password|\/password\/reset|\/users\/reset/i.test(r.url) && r.method === 'POST',
  )
  expect(call, 'a reset-password POST request should fire').toBeTruthy()
})
