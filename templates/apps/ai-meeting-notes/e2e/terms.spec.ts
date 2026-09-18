/**
 * /terms — terms of service.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('main heading is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByRole('heading', { name: /terms/i }).first()).toBeVisible()
})

test('acceptable-use / prohibited-conduct section renders', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  await expect(page.getByText(/acceptable use|prohibited|conduct|misuse/i).first()).toBeVisible()
})

test('subscription / billing language is present', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/subscription|billing|payment|plan|stripe/i)
})

test('user content / data ownership clause renders', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/your content|user content|own|license/i)
})

test('termination clause renders', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/terminat|cancel|suspen/i)
})

test('contact email or section is provided', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/contact|@|email/i)
})

test('multiple section headings (h2/h3) render', async ({ page }) => {
  await page.goto(APP_BASE + '/terms')
  const headings = page.locator('h2, h3')
  await expect(headings.nth(1)).toBeAttached()
})
