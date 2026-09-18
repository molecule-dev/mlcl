import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { APP_BASE, captureNetwork } from './_helpers'

// /privacy — static legal page.

test.describe('/privacy', () => {
  test('renders without auth and without 5xx', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/privacy')
    })
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
    expect(reqs.find((r) => r.status >= 500)).toBeUndefined()
  })

  test('a back/home link is present', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    // A bare count() does not wait, so this raced React mounting — the page has
    // four links (brand → /, Sign in, Start free, About) but the assertion ran
    // before any of them existed. The sibling privacy spec showed it as flaky.
    await expect(page.getByRole('link').first()).toBeVisible()
  })

  test('contains the word "privacy" in the heading', async ({ page }) => {
    await page.goto(APP_BASE + '/privacy')
    const h1 = await page.getByRole('heading', { level: 1 }).first().textContent()
    expect(h1?.toLowerCase()).toContain('privacy')
  })
})
