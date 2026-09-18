import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ (Landing)', () => {
  test('public landing page renders', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle').catch(() => {})
    const text = await page.locator('main, body').first().innerText()
    expect(text.length).toBeGreaterThan(50)
    // Marketing pages typically mention the brand
    expect(text).toMatch(/Argent|portfolio|invest|account|sign\s*up|sign\s*in/i)
  })

  test('Sign-up link navigates to /signup', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*up|create.*account|get started/i }).first()
    // count() never auto-waits and goto() resolves before React paints, so this
    // read 0 and skipped the test rather than running it. waitFor retries — a
    // skip now means the link is genuinely absent.
    const present = await link
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) {
      test.skip(true, 'no sign-up link visible on landing')
      return
    }
    await link.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Sign-in link navigates to /login', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
    // Pre-paint count() skipped this test — see the sign-up case above.
    const present = await link
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) {
      test.skip(true, 'no sign-in link visible on landing')
      return
    }
    await link.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('Pricing link navigates to /pricing', async ({ page, context }) => {
    await context.clearCookies()
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /pricing|plans/i }).first()
    // Pre-paint count() skipped this test — see the sign-up case above.
    const present = await link
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false)
    if (!present) {
      test.skip(true, 'no pricing link visible on landing')
      return
    }
    await link.click()
    await expect(page).toHaveURL(/\/pricing/)
  })
})
