import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password (ResetPassword)', () => {
  test('new password input is masked', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    const pw = page.locator('input[type="password"]').first()
    await pw.fill('Brandnew123!')
    await expect(pw).toHaveAttribute('type', 'password')
  })

  test('confirm password input is masked and accepts a value', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token')
    const pws = page.locator('input[type="password"]')
    await expect(pws).toHaveCount(2, { timeout: 5_000 })
    const confirm = pws.nth(1)
    await confirm.fill('Brandnew123!')
    await expect(confirm).toHaveValue('Brandnew123!')
  })

  test('Submit POSTs /api/users/reset-password (any token, even invalid)', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=fake-token&email=reset-target@example.test')
    const reqs = await captureNetwork(page, async () => {
      // Page has email (prefilled), token (prefilled from query), new password,
      // optional 2FA. Fill the only field still empty: the new password.
      // input[type="password"] matches both the token-as-password input AND the
      // new password input. Use nth(1) for the new password.
      const pws = page.locator('input[type="password"]')
      await pws.nth(1).fill('Brandnew123!')
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(750)
    })
    const call = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(call, 'POST /api/users/reset-password must be issued').toBeTruthy()
    // Token is fake → handler responds with 4xx; we only require the call was issued.
    expect(call!.status).toBeGreaterThanOrEqual(200)
  })
})
