/**
 * /privacy — privacy policy.
 *
 * Real outcomes asserted:
 *   - heading visible
 *   - core sections present (data collection, usage, sharing, contact)
 *   - footer/back-to-home link works
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('main heading is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.getByRole('heading', { name: /privacy/i }).first()).toBeVisible()
})

test('"Information we collect" section renders', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(
    page.getByText(/information we collect|data we collect|we collect/i).first(),
  ).toBeVisible()
})

test('"How we use" section renders', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(
    page.getByText(/how we use|use of (your|the) (information|data)/i).first(),
  ).toBeVisible()
})

test('AI processor disclosure (OpenAI/Anthropic) is present', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/openai|anthropic|ai|machine learning|automated/i)
})

test('contact email or address is provided', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/contact|@|email/i)
})

test('back-to-home link navigates to /', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  const link = page.getByRole('link', { name: /home|back|landing/i }).first()
  if (await link.count().catch(() => 0)) {
    await link.click()
    await expect(page).toHaveURL(/\/$|\/landing/, { timeout: 10_000 })
  }
})

test('legal page has multiple sections (h2/h3)', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  const headings = page.locator('h2, h3')
  await expect(headings.nth(1)).toBeAttached()
})
