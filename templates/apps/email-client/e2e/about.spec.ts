/**
 * Per-page spec for /about (About). Public marketing page.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('GET /about renders a non-empty heading', async ({ page }) => {
  await page.goto(APP_BASE + '/about')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('GET /about has substantive product copy (>200 chars, no stubs)', async ({ page }) => {
  await page.goto(APP_BASE + '/about')
  await page.waitForLoadState('networkidle')
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text).not.toMatch(/coming soon|placeholder|tbd|under construction|lorem ipsum/i)
})

test('/about exposes at least one navigation link back to other pages', async ({ page }) => {
  await page.goto(APP_BASE + '/about')
  const linkCount = await page.locator('a').count()
  expect(linkCount).toBeGreaterThan(0)
})
