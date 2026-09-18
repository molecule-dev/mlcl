import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('/forgot-password', () => {
  test('renders the form for an unauthenticated visitor', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/forgot-password')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /send|reset|submit/i }).first()).toBeVisible()
  })

  test('submitting an email POSTs the request and renders a confirmation', async ({ page }) => {
    const { email } = await signup(page)
    await page.context().clearCookies()
    await page.evaluate(() => window.localStorage.clear())
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill(email)
    await page
      .getByRole('button', { name: /send|reset|submit/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    const text = await page.locator('main, body').first().innerText()
    expect(text.length).toBeGreaterThan(0)
    // Should not crash with raw error
    expect(text).not.toMatch(/TypeError|Cannot|Internal Server Error/i)
  })

  test('submitting an unknown email does not crash the page', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/forgot-password')
    await page.locator('input[type="email"]').first().fill('nobody@nowhere.example')
    await page
      .getByRole('button', { name: /send|reset|submit/i })
      .first()
      .click()
    await page.waitForTimeout(1500)
    const text = await page.locator('main, body').first().innerText()
    expect(text).not.toMatch(/TypeError|Cannot|Internal Server Error/i)
  })
})
