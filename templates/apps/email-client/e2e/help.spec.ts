/**
 * Per-page spec for /help (Help / FAQ). Public.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('GET /help renders a heading', async ({ page }) => {
  await page.goto(APP_BASE + '/help')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('GET /help renders substantive content (>200 chars, no stubs)', async ({ page }) => {
  await page.goto(APP_BASE + '/help')
  await page.waitForLoadState('networkidle')
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text).not.toMatch(/coming soon|placeholder|tbd|under construction|lorem ipsum/i)
})

test('GET /help renders multiple FAQ items or sub-headings', async ({ page }) => {
  await page.goto(APP_BASE + '/help')
  const sections = await page.locator('h2, h3, details, [role="heading"]').count()
  expect(sections).toBeGreaterThanOrEqual(2)
})
