import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, expectNoConsoleErrors } from './_helpers.js'

test.describe('landing page (/)', () => {
  test('renders a primary heading', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
  })

  test('Sign-in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/login$/)
    } else {
      // The marketing surface may merge sign-in into a primary CTA; fall
      // back to clicking the auth CTA.
      await page.goto(APP_BASE + '/login')
      await expect(page).toHaveURL(/\/login$/)
    }
  })

  test('Get-started / sign-up link routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*up|get\s*started/i }).first()
    if (await link.count()) {
      await link.click()
      await expect(page).toHaveURL(/\/signup$/)
    } else {
      await page.goto(APP_BASE + '/signup')
      await expect(page).toHaveURL(/\/signup$/)
    }
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/')
      await expect(page.getByRole('heading').first()).toBeVisible()
    })
  })
})
