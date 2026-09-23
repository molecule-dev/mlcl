import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRaw, captureNetwork, signup } from './_helpers.js'

test('/reset-password renders a password input when given a token query string', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/reset-password?token=fake-token-for-render-only')
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
})

test('/reset-password renders a submit button when given a token query string', async ({
  page,
}) => {
  await page.goto(APP_BASE + '/reset-password?token=fake-token-for-render-only')
  await expect(page.getByRole('button', { name: /reset|update|save/i }).first()).toBeVisible()
})

test('POST /api/users/reset-password with an invalid token is rejected with 4xx', async ({
  page,
}) => {
  await signup(page)
  const resp = await apiRaw(page, 'POST', '/users/reset-password', {
    token: 'definitely-not-a-real-token',
    password: 'NewPassword12345!',
  })
  expect(resp.status()).toBeGreaterThanOrEqual(400)
})

test('observation invariant: /reset-password fires POST /api/users/reset-password on submit', async ({
  page,
}) => {
  // A fabricated token is expected to be rejected (401) — the browser logs
  // the failed resource load, which this test explicitly allows: the
  // invariant under test is that the POST FIRES, not that it succeeds.
  test.info().annotations.push({
    type: 'allow-console-error',
    description: 'status of 401',
  })
  // Pass token + email in the URL so the controlled inputs are
  // pre-populated, then fill the password field. All three are required
  // by the form so leaving any blank means the submit click is silently
  // suppressed by the browser's required-field validation.
  await page.goto(APP_BASE + '/reset-password?token=any-token&email=test@example.com')
  const reqs = await captureNetwork(page, async () => {
    await page.locator('input[type="password"]').first().fill('NewPassword12345!')
    await page
      .getByRole('button', { name: /reset|update|save/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
  })
  expect(
    reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST'),
  ).toBeTruthy()
})
