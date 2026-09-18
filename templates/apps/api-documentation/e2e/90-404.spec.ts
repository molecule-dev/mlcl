import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers'

// /404 — public NotFound. Same component is used for the wildcard route.

test.describe('/404', () => {
  test('renders the {endpoint} 404 banner with no 5xx network errors', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/404')
      await page.getByRole('heading', { level: 1 }).waitFor({ timeout: 15_000 })
    })
    expect(
      reqs.find((r) => r.status >= 500),
      'no 5xx during /404 render',
    ).toBeUndefined()
  })

  test('"Back to home" link navigates to /', async ({ page }) => {
    await page.goto(APP_BASE + '/404')
    await page.getByRole('link', { name: /back to home/i }).click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('HTTP 404 eyebrow text visible', async ({ page }) => {
    await page.goto(APP_BASE + '/404')
    await expect(page.getByText(/HTTP 404/i)).toBeVisible({ timeout: 15_000 })
  })
})
