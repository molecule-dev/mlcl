import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password', () => {
  test('email field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const tb = page.getByLabel(/Email address/i)
    await tb.fill('me@example.com')
    await expect(tb).toHaveValue('me@example.com')
  })

  test('reset token field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const tb = page.getByLabel(/Reset token/i)
    await tb.fill('abc-token-1234')
    await expect(tb).toHaveValue('abc-token-1234')
  })

  test('new password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const tb = page.getByLabel(/New password/i)
    await tb.fill('NewPass123!')
    await expect(tb).toHaveValue('NewPass123!')
  })

  test('confirm password field accepts input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    const tb = page.getByLabel(/Confirm password/i)
    await tb.fill('NewPass123!')
    await expect(tb).toHaveValue('NewPass123!')
  })

  test('"Reset password" actually fires the reset endpoint (proves the form is wired)', async ({
    page,
  }) => {
    // The bogus token deliberately provokes a 401 from the reset endpoint —
    // that rejection IS the wired behaviour this test proves.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 401',
    })
    await page.goto(APP_BASE + '/reset-password')
    await page.getByLabel(/Email address/i).fill('me@pylon.test')
    await page.getByLabel(/Reset token/i).fill('bogus-token-for-test')
    await page.getByLabel(/New password/i).fill('NewPass123!')
    await page.getByLabel(/Confirm password/i).fill('NewPass123!')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Reset password/i }).click()
      // Either we redirect away (real token works) or we surface an error
      // alert (bogus token). Either way the network call must have fired.
      await page
        .locator('[data-mol-id="reset-error"], [role="alert"]')
        .first()
        .waitFor({ timeout: 10_000 })
        .catch(() => {})
    })
    expect(
      reqs.some((r) => r.method === 'POST' && /\/reset-password/.test(r.url)),
      'POST /api/users/reset-password must be observed',
    ).toBeTruthy()
  })

  test('"Back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/i }).click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('brand "Pylon" link returns to landing /', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /^Pylon ?\.?$/i })
      .first()
      .click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })

  test('mismatched new + confirm password surfaces an inline error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByLabel(/Email address/i).fill('me@pylon.test')
    await page.getByLabel(/Reset token/i).fill('whatever')
    await page.getByLabel(/New password/i).fill('NewPass123!')
    await page.getByLabel(/Confirm password/i).fill('OTHER')
    await page.getByRole('button', { name: /Reset password/i }).click()
    await expect(page.locator('[data-mol-id="reset-error"]')).toBeVisible()
    expect(page.url()).toMatch(/\/reset-password/)
  })
})
