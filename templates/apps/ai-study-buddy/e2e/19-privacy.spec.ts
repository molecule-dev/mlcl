/**
 * /privacy — public privacy policy. Static legal page, but it must
 * render without auth and with non-empty body content.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('/privacy renders without auth', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  await expect(page.locator('[data-mol-id="page-privacy"]')).toBeVisible()
})

test('/privacy renders an h1 heading', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})

test('/privacy body has non-trivial content', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  const text = await page.locator('main, body').first().innerText()
  expect(text.length).toBeGreaterThan(200)
})

test('/privacy renders multiple section headings (h2)', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  const h2Count = await page.getByRole('heading', { level: 2 }).count()
  expect(h2Count).toBeGreaterThanOrEqual(2)
})

test('/privacy h1 reads "Privacy Policy"', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/privacy policy/i)
})

test('/privacy renders enough body paragraphs for a real policy', async ({ page }) => {
  await page.goto(`${APP_BASE}/privacy`)
  const paragraphs = await page.locator('p').count()
  expect(paragraphs).toBeGreaterThanOrEqual(4)
})
