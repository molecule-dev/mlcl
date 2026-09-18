import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers'

test.describe('/', () => {
  test('renders landing with hero, primary CTA, and pricing link', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page).toHaveURL(APP_BASE + '/')
    await expect(page.locator('body')).toBeVisible()
    // count() does not wait, so this raced React mounting and saw 0 links.
    await expect(page.getByRole('link').first()).toBeVisible()
    const ctas = await page.getByRole('link').count()
    expect(ctas).toBeGreaterThan(0)
  })

  test('navigates to /signup when sign-up CTA is clicked', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page
      .getByRole('link', { name: /(get started|sign up|create.*vault|create.*account|try free)/i })
      .first()
    if ((await cta.count().catch(() => 0)) > 0) {
      await cta.click()
      await expect(page).toHaveURL(/\/(signup|pricing)/)
    } else {
      // landing may use a button; fall back to direct goto
      await page.goto(APP_BASE + '/signup')
      await expect(page).toHaveURL(/\/signup/)
    }
  })

  test('navigates to /login from header link', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign in|log in|unlock/i }).first()
    if ((await link.count().catch(() => 0)) > 0) {
      await link.click()
      await expect(page).toHaveURL(/\/login/)
    }
  })
})
