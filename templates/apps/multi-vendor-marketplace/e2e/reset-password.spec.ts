import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password?token=stub', () => {
  test('password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=stub')
    await page
      .getByLabel(/new password/i)
      .first()
      .fill('NewPass1!')
    await expect(page.getByLabel(/new password/i).first()).toHaveValue('NewPass1!')
  })

  test('confirm field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=stub')
    await page
      .getByLabel(/confirm/i)
      .first()
      .fill('NewPass1!')
    await expect(page.getByLabel(/confirm/i).first()).toHaveValue('NewPass1!')
  })

  test('submit issues request', async ({ page }) => {
    // A stub token is expected to be rejected (401) by the API — the spec
    // asserts the REQUEST is issued, not that it succeeds. The browser logs
    // any non-2xx fetch as a console error, so allow that expected 401.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(APP_BASE + '/reset-password?token=stub&email=test%40example.com')
    await page
      .getByLabel(/account email|^email/i)
      .first()
      .fill('test@example.com')
    await page
      .getByLabel(/new password/i)
      .first()
      .fill('NewPass1!')
    await page
      .getByLabel(/confirm/i)
      .first()
      .fill('NewPass1!')
    const reqs = await captureNetwork(page, async () => {
      await page
        .getByRole('button', { name: /reset|update/i })
        .first()
        .click()
      await page.waitForTimeout(1500)
    })
    expect(
      reqs.some((r) => /\/api\/users\/reset-password|\/api\/users\/forgot-password/i.test(r.url)),
    ).toBeTruthy()
  })
})
