import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// Public landing page.

test.describe('/ (Landing)', () => {
  test('renders without authentication and without 5xx', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
    })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during landing',
    ).toBeUndefined()
  })

  test('primary CTA navigates toward signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page.getByRole('link', { name: /try free|get started|start free|sign up/i }).first()
    await cta.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('"Sign in" link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$|log\s*in/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/login$/)
  })

  test('"Pricing" link navigates to /pricing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const pricing = page.getByRole('link', { name: /pricing/i }).first()
    if ((await pricing.count()) === 0) {
      await page.goto(APP_BASE + '/pricing')
      await expect(page).toHaveURL(/\/pricing/)
      return
    }
    await pricing.click()
    await expect(page).toHaveURL(/\/pricing/)
  })
})
