/**
 * Public marketing/legal pages must render without auth and contain real
 * copy (not stubs). Each spec also covers route literal coverage for
 * /about, /pricing, /privacy, /terms, /help, /plan-updated, and /forgot-password.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('GET /about renders the marketing About page with at least one heading', async ({ page }) => {
  await page.goto(APP_BASE + '/about')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('h1, h2').first()).toBeVisible()
  // Real content, not Coming-soon stub
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text).not.toMatch(/coming soon|placeholder|tbd|under construction/i)
})

test('GET /privacy renders a real privacy policy', async ({ page }) => {
  await page.goto(APP_BASE + '/privacy')
  await expect(page.locator('h1, h2').first()).toBeVisible()
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text.toLowerCase()).toMatch(/privacy|data|cookie/)
})

test('GET /terms renders the terms of service', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.locator('h1, h2').first()).toBeVisible()
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
  expect(text.toLowerCase()).toMatch(/terms|service|use|agreement/)
})

test('GET /help renders a real help/FAQ page', async ({ page }) => {
  await page.goto(APP_BASE + '/help')
  await expect(page.locator('h1, h2').first()).toBeVisible()
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(200)
})

test('GET /pricing renders billing tiers fetched from /api/billing/tiers', async ({ page }) => {
  let tiersCalled = false
  page.on('response', (resp) => {
    if (/\/api\/billing\/tiers/.test(resp.url()) && resp.status() === 200) tiersCalled = true
  })
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  expect(tiersCalled, 'pricing should fetch /api/billing/tiers').toBe(true)
  // The pricing page must show at least one tier and at least one priced label.
  const text = await page.evaluate(() => document.body.innerText)
  expect(text).toMatch(/\$/) // some price renders
  expect(text.toLowerCase()).toMatch(/plan|tier|free|pro|starter|month|year/)
})

test('GET /plan-updated shows a confirmation page with a return-home link', async ({ page }) => {
  await page.goto(APP_BASE + '/plan-updated')
  await page.waitForLoadState('networkidle')
  // The page must show a confirmation cue and a way back home.
  const text = await page.evaluate(() => document.body.innerText)
  expect(text.length).toBeGreaterThan(50)
  // Must have at least one link
  const links = await page.locator('a').count()
  expect(links).toBeGreaterThan(0)
})

test('GET /forgot-password renders the reset-request form', async ({ page }) => {
  await page.goto(APP_BASE + '/forgot-password')
  await expect(page.locator('input[type="email"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /reset|send/i }).first()).toBeVisible()
})

test('GET /reset-password renders the new-password form', async ({ page }) => {
  await page.goto(APP_BASE + '/reset-password?token=fakeforuiloadtest')
  await expect(page.locator('input[type="password"]').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /reset|update|submit/i }).first()).toBeVisible()
})
