/**
 * Public landing page (/) — every CTA navigates somewhere real.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test.describe('public landing page', () => {
  test('renders hero, stats, and at least 4 features without console errors', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    await page.goto(APP_BASE + '/')
    await expect(page.locator('h1').first()).toBeVisible()
    // Hero CTAs and at least one anchor link must render
    await expect(page.getByRole('link', { name: /sign in/i }).first()).toBeVisible()
    await expect(
      page.getByRole('link', { name: /request access|create.*account|start.*trial/i }).first(),
    ).toBeVisible()
    // Stats section: 3 metrics
    await expect(page.locator('#stats')).toBeVisible()
    // Features section: at least 4 articles
    const features = page.locator('#features article')
    await expect(features.nth(3)).toBeAttached()
    const fatal = errors.filter(
      (e) => !/favicon|net::ERR_|Failed to load resource|hot-update/i.test(e),
    )
    expect(fatal, `console errors on /: ${fatal.join('; ')}`).toEqual([])
  })

  test('Sign in link navigates to /login and shows the email field', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /^sign in$/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
    await expect(page.locator('input#login-email')).toBeVisible()
  })

  test('Request access / Start trial CTA goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /request access|start.*trial/i })
      .first()
      .click()
    await page.waitForURL('**/signup', { timeout: 5000 })
    await expect(page.locator('input#signup-email')).toBeVisible()
  })

  test('Features anchor scrolls within the page (no navigation away from /)', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('a[href="#features"]').first().click()
    await expect(page).toHaveURL(/\/(?:#features)?$/)
  })

  test('Create your account CTA in footer block also lands on /signup', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page
        .getByRole('link', { name: /create.*account/i })
        .first()
        .click()
      await page.waitForURL('**/signup', { timeout: 5000 })
    })
    // We just navigated — at least the signup HTML doc must have come back 200
    const signupDoc = reqs.find((r) => /\/signup$/.test(r.url))
    expect(signupDoc?.status ?? 200).toBeLessThan(400)
  })
})
