import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test.describe('/ landing', () => {
  test('renders the start-planning CTA and the RSVP code entrance', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page.locator('[data-mol-id="hero-signup"], [data-mol-id="hero-dashboard"]').first(),
    ).toBeVisible()
    await expect(page.locator('[data-mol-id="landing-rsvp-card"]')).toBeVisible()
  })

  test('RSVP code entrance navigates to /rsvp/:code', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.locator('[data-mol-id="landing-rsvp-code-input"]').fill('rose-garden-417')
    await page.locator('[data-mol-id="landing-rsvp-submit"]').click()
    await expect(page).toHaveURL(/\/rsvp\/ROSE-GARDEN-417$/)
  })

  test('unknown RSVP code shows the not-found page, not a crash', async ({ page }) => {
    await page.goto(APP_BASE + '/rsvp/NO-SUCH-CODE-999')
    await expect(page.locator('[data-mol-id="page-rsvp-not-found"]')).toBeVisible({
      timeout: 10000,
    })
  })

  test('Create account CTA navigates to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const signupLink = page.locator('a[href="/signup"]').first()
    await signupLink.click()
    await expect(page).toHaveURL(/\/signup/)
  })

  test('Log in footer link navigates to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const loginLink = page.locator('a[href="/login"]').first()
    await loginLink.click()
    await expect(page).toHaveURL(/\/login/)
  })

  test('authenticated landing links straight to the dashboard', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/')
    const dash = page.locator('a[href="/dashboard"]').first()
    await expect(dash).toBeVisible()
    await dash.click()
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('landing fires no server-side errors on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
    const bad = reqs.filter((r) => r.status() >= 500)
    expect(bad, JSON.stringify(bad, null, 2)).toHaveLength(0)
  })
})
