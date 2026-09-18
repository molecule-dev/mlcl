import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/reset-password', () => {
  test('renders the form', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=stub')
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /reset|update|save|set/i }).first()).toBeVisible()
  })

  test('submitting without a token surfaces an error', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password')
    await page.locator('input[type="password"]').first().fill('NewPass123!')
    const confirm = page.locator('input[type="password"]').nth(1)
    if (await confirm.count()) await confirm.fill('NewPass123!')
    await page
      .getByRole('button', { name: /reset|update|save|set/i })
      .first()
      .click()
    await page.waitForTimeout(2000)
    const text = await page.locator('body').innerText()
    expect(text.toLowerCase()).toMatch(/token|invalid|expired|missing|error/)
  })

  test('"back to sign in" link goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/reset-password?token=stub')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in|back/i }).first()
    if ((await link.count()) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    }
  })
})
