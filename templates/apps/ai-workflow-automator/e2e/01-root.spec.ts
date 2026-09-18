import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('/ (landing) and core static routes', () => {
  test('/ renders the marketing landing without auth', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/dendrite/i).first()).toBeVisible()
  })

  test('/ has signup CTA that goes to /signup', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const cta = page
      .getByRole('link', { name: /start free|build your first|sign\s*up|start automating/i })
      .first()
    await expect(cta).toBeVisible()
    await cta.click()
    await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
  })

  test('/ has login link that goes to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/')
    const link = page.getByRole('link', { name: /sign\s*in/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test('/about renders the about page', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/dendrite|about/i)
  })

  test('/help renders the help page', async ({ page }) => {
    await page.goto(APP_BASE + '/help')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/help|support|faq|guide|docs/i)
  })

  test('/privacy renders the privacy page', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/privacy/i)
  })

  test('/terms renders the terms page', async ({ page }) => {
    await page.goto(APP_BASE + '/terms')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).toContainText(/terms/i)
  })

  test('/an-unknown-route renders a not-found shell', async ({ page }) => {
    await page.goto(APP_BASE + '/this-route-does-not-exist-xyz')
    await page.waitForLoadState('networkidle')
    const body = (await page.locator('body').innerText()).toLowerCase()
    expect(body).toMatch(/not\s*found|404|no.*page|lost/)
  })
})
