import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, expectNoConsoleErrors } from './_helpers.js'

test.describe('/ landing page', () => {
  test('page renders without crashing', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(page.locator('h1').first()).toBeVisible()
  })

  test('shows the Evenly brand and a primary CTA to sign up', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await expect(
      page
        .getByRole('link', { name: /sign\s*up|create.*account|get\s*started|start\s*free/i })
        .first(),
    ).toBeVisible()
  })

  test('Sign in / Log in link routes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page
      .getByRole('link', { name: /sign\s*in|log\s*in/i })
      .first()
      .click()
    await page.waitForURL('**/login', { timeout: 5000 })
  })

  test('URL persists across reload', async ({ page }) => {
    await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.reload()
    })
    expect(page.url()).toMatch(/\/$|\/?$/)
  })

  test('renders without console errors', async ({ page }) => {
    await expectNoConsoleErrors(page, async () => {
      await page.goto(APP_BASE + '/')
      await page.waitForLoadState('networkidle')
    })
  })
})
