import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('/reset-password — Confirm new password', () => {
  test('renders email + token + new-password fields', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('input#email')).toBeVisible()
    await expect(page.locator('input#token')).toBeVisible()
    await expect(page.locator('input#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible()
  })

  test('Reading email + token from URL pre-fills the form', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=foo%40example.com&token=tok-123')
    await expect(page.locator('input#email')).toHaveValue('foo@example.com')
    await expect(page.locator('input#token')).toHaveValue('tok-123')
  })

  test('Submitting an invalid token surfaces an error and stays on /reset-password', async ({
    page,
  }) => {
    // The failed reset POST is the behavior under test — allow its expected
    // 4xx console line so the console guard does not fail the assertions.
    test.info().annotations.push({
      type: 'allow-console-error',
      description: 'status of 4',
    })
    await page.goto(APP_BASE + '/reset-password')
    const reqs = await captureNetwork(page, async () => {
      await page.locator('input#email').fill('nobody+nope@example.com')
      await page.locator('input#token').fill('definitely-not-a-real-token')
      await page.locator('input#password').fill('NewPass!1234')
      await page.getByRole('button', { name: /reset password/i }).click()
      await page.waitForTimeout(1500)
    })
    await expect(page).toHaveURL(/\/reset-password/)
    await expect(page.locator('[data-mol-id="reset-error"]')).toBeVisible({ timeout: 10000 })
    const hit = reqs.find(
      (r) => r.method === 'POST' && /reset.password|reset_password/i.test(r.url),
    )
    expect(hit, 'reset-password POST must fire on submit').toBeTruthy()
  })

  test('"Back to sign in" link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /back to sign in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Request a new link" link routes to /forgot-password', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page
      .getByRole('link', { name: /request a new link/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/forgot-password$/)
  })
})
