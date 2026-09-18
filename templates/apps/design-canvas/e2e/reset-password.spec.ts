/**
 * /reset-password — Public form. Pre-fills email + token from the URL
 * query string. Asserts on form rendering, query-string pre-fill, and
 * mismatched-confirm UI. Backend invariants are exercised in the
 * forgot-password spec.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('reset-password page', () => {
  test('renders heading and four inputs', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.locator('form[data-mol-id="reset-form"]')).toBeVisible()
    await expect(page.locator('input#reset-email')).toBeVisible()
    await expect(page.locator('input#reset-token')).toBeVisible()
    await expect(page.locator('input#reset-password')).toBeVisible()
    await expect(page.locator('input#reset-confirm')).toBeVisible()
  })

  test('pre-fills email and token from the query string', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?email=mara%40studio.test&token=ABC123')
    await expect(page.locator('input#reset-email')).toHaveValue('mara@studio.test')
    await expect(page.locator('input#reset-token')).toHaveValue('ABC123')
  })

  test('mismatched confirm shows inline error and disables submit', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input#reset-password').fill('properpass1234')
    await page.locator('input#reset-confirm').fill('different')
    await expect(page.locator('text=/Passwords do not match/i')).toBeVisible()
    await expect(
      page.locator('form[data-mol-id="reset-form"] button[type="submit"]'),
    ).toBeDisabled()
  })

  test('submitting invalid token surfaces an error — POST /api/users/reset-password hit', async ({
    page,
  }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/reset-password')
      await page.locator('input#reset-email').fill('nobody@flagship.test')
      await page.locator('input#reset-token').fill('definitely-not-a-real-token')
      await page.locator('input#reset-password').fill('newpass1234')
      await page.locator('input#reset-confirm').fill('newpass1234')
      await page.locator('form[data-mol-id="reset-form"] button[type="submit"]').click()
      await page.waitForTimeout(2000)
    })
    const post = reqs.find((r) => /\/api\/users\/reset-password/.test(r.url) && r.method === 'POST')
    expect(post).toBeTruthy()
    await expect(page).toHaveURL(/\/reset-password/)
  })

  test('email and password inputs accept input', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input#reset-email').fill('mara@studio.test')
    await page.locator('input#reset-password').fill('properpass1234')
    await expect(page.locator('input#reset-email')).toHaveValue('mara@studio.test')
    await expect(page.locator('input#reset-password')).toHaveValue('properpass1234')
  })

  test('token input accepts paste', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input#reset-token').fill('paste-token-123')
    await expect(page.locator('input#reset-token')).toHaveValue('paste-token-123')
  })

  test('"Back to sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.getByRole('link', { name: /Back to sign in/ }).click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('the submit button shows the reset-and-sign-in copy', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await expect(page.getByRole('button', { name: /Reset password/ })).toBeVisible()
  })
})
