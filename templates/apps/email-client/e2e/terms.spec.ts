/**
 * Per-page spec for /terms (Terms of Service). Public.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('GET /terms renders a heading', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('GET /terms contains real terms-of-service copy', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text.toLowerCase()).toMatch(/terms|service|use|agreement/)
  expect(text).not.toMatch(/coming soon|lorem ipsum/i)
})

test('GET /terms exposes at least one link', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const links = await page.locator('a').count()
  expect(links).toBeGreaterThan(0)
})
