import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, signup } from './_helpers'

test.describe('/plan-updated', () => {
  test('redirects unauth user to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('signed-in user sees the thank-you screen and the return-home link', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByRole('heading').first()).toBeVisible()
    const home = page
      .getByRole('link')
      .filter({ hasText: /home|return|back|/i })
      .first()
    await expect(home).toBeVisible()
  })
})
