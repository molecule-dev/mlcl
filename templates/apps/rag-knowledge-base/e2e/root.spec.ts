/**
 * / (Landing) — public marketing surface.
 *
 * Verifies the landing page renders and links into the auth surface.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE } from './_helpers.js'

test.describe('landing', () => {
  test('renders an h1 brand headline', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const h1 = page.getByRole('heading', { level: 1 }).first()
    await expect(h1).toBeVisible()
    const text = (await h1.textContent()) ?? ''
    expect(text.trim().length).toBeGreaterThan(0)
  })

  test('mentions the Lexicon brand name on the page', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    // branding.ts APP_NAME is 'Lexicon'; 'Engram' was an earlier name that
    // survived in a handful of spec docblocks and this one assertion.
    await expect(page.getByText(/lexicon/i).first()).toBeVisible()
  })

  test('Sign in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const signInLink = page.getByRole('link', { name: /sign\s*in/i }).first()
    await expect(signInLink).toBeVisible()
    await signInLink.click()
    await page.waitForURL(/\/login/, { timeout: 10_000 })
  })

  test('Start-free-trial CTA routes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page
      .getByRole('link', { name: /start\s+free\s+trial|get\s*started|sign\s*up|create\s*account/i })
      .first()
    await expect(cta).toBeVisible()
    await cta.click()
    await page.waitForURL(/\/signup/, { timeout: 10_000 })
  })
})
