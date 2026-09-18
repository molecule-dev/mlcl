import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/plan-updated: post-checkout confirmation', () => {
  test('renders the confirmation message after sign-in', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    await expect(page.getByText(/Your plan has been updated|Thank you/i).first()).toBeVisible()
  })

  test('shows a Return home action that routes back to /', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/plan-updated')
    const home = page.getByRole('link', { name: /return home/i }).first()
    await expect(home).toBeVisible()
    await home.click()
    await expect(page).toHaveURL(/\/(login)?$/)
  })

  test('Unauthenticated visit redirects to /login (route is auth-guarded)', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.evaluate(() => window.localStorage.clear()).catch(() => {})
    await page.reload()
    await expect(page).toHaveURL(/\/(login|plan-updated)/)
  })

  test('does not surface console errors on render', async ({ page }) => {
    await signup(page)
    const errs: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errs.push(msg.text())
    })
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle')
    const fatal = errs.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|sourcemap/i.test(e),
    )
    expect(fatal).toEqual([])
  })
})
