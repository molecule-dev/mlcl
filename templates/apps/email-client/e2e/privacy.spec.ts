/**
 * Per-page spec for /privacy (Privacy Policy). Public.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('GET /privacy renders a heading', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.locator('h1, h2').first()).toBeVisible()
})

test('GET /privacy contains real privacy-policy copy', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text.toLowerCase()).toMatch(/privacy|data|cookie/)
  expect(text).not.toMatch(/coming soon|lorem ipsum/i)
})

test('GET /privacy exposes at least one link back', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  const links = await page.locator('a').count()
  expect(links).toBeGreaterThan(0)
})
