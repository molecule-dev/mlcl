/**
 * Per-page spec for /reset-password. Public (token-gated).
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('GET /reset-password renders the new-password form', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake-ui-load')
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /reset|update|submit/i }).first()).toBeVisible()
})

test('Confirm-password mismatch shows an inline error and disables submit', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fake-mismatch')
  const inputs = page.locator('input[type="password"]')
  await inputs.nth(0).fill('Password123!')
  await inputs.nth(1).fill('Different456!')
  // The page renders the mismatch warning live (no click needed) and
  // disables the submit button. Assert both.
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /match|mismatch|do not match|don.?t match/i })
      .first(),
  ).toBeVisible()
  const submit = page.getByRole('button', { name: /reset|update|submit/i }).first()
  await expect(submit).toBeDisabled()
})

test('Submitting matched passwords posts to /api/users/reset-password', async ({ page }) => {
  // The token is intentionally fake — the backend 401s it, which the
  // console-guard would otherwise treat as an unexpected console error.
  test.info().annotations.push({ type: 'allow-console-error', description: 'status of 401' })
  await page.goto(APP_BASE + '/reset-password?token=any-token-for-network-check')
  const inputs = page.locator('input[type="password"]')
  await inputs.nth(0).fill('Password123!')
  if ((await inputs.count()) > 1) await inputs.nth(1).fill('Password123!')
  const submit = page.getByRole('button', { name: /reset|update|submit/i }).first()
  // Hydration gate: submit stays disabled until the fields validate AND
  // React has attached handlers — under fleet-load the bare click could
  // land pre-hydration and the POST never fires.
  await expect(submit).toBeEnabled({ timeout: 15000 })
  const posted = page.waitForResponse((r) => /\/api\/users\/reset-password$/.test(r.url()), {
    timeout: 20000,
  })
  const reqs = await captureNetwork(page, async () => {
    await submit.click()
    // Keep the capture window open until the POST's response lands, so
    // the recorded table includes it.
    await posted
  })
  await posted
  expect(reqs.some((r) => /\/api\/users\/reset-password$/.test(r.url))).toBe(true)
})
