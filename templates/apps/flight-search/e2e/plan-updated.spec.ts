import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated page', () => {
  test('renders thank-you heading when authenticated', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(1200)
    await expect(page).toHaveURL(/\/plan-updated/)
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  })

  test('"Return home" link routes back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(800)
    await page.locator('a[href="/"]').first().click()
    await expect(page).toHaveURL(new RegExp(`${APP_BASE.replace(/[/.]/g, '\\$&')}/?$`))
  })

  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForTimeout(1200)
    await expect(page).toHaveURL(/\/login/)
  })
})
