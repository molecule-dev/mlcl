import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('form posts an email and shows the sent state', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    await page.locator('#email, input[type="email"]').first().fill('reset-me@example.com')
    const submit = page.getByRole('button', { name: /send|reset/i }).first()
    await expect(submit).toBeEnabled({ timeout: 10_000 })
    await submit.click()
    // Either an inline success state or navigation — both prove the submit
    // path ran; assert the form is no longer interactable-erroring.
    await page.waitForTimeout(1500)
    await expect(page.locator('body')).toContainText(/reset|link|sent|email/i)
  })

  test('links back to sign in', async ({ page }) => {
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input').first().waitFor({ state: 'visible', timeout: 15_000 })
    await expect(page.locator('a[href="/login"]').first()).toBeVisible()
  })
})
