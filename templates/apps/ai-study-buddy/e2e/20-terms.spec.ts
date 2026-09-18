/**
 * /terms — public terms-of-service. Static legal page, must render
 * without auth and have non-empty body content.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('/terms renders without auth', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  await expect(page.locator('[data-mol-id="page-terms"]')).toBeVisible()
})

test('/terms renders an h1 heading', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})

test('/terms body has non-trivial content', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  const text = await page.locator('main, body').first().innerText()
  expect(text.length).toBeGreaterThan(200)
})

test('/terms renders multiple section headings (h2)', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  const h2Count = await page.getByRole('heading', { level: 2 }).count()
  expect(h2Count).toBeGreaterThanOrEqual(2)
})

test('/terms h1 reads "Terms of Service"', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  await expect(page.getByRole('heading', { level: 1 }).first()).toContainText(/terms of service/i)
})

test('/terms renders enough body paragraphs for a real policy', async ({ page }) => {
  await page.goto(`${APP_BASE}/terms`)
  const paragraphs = await page.locator('p').count()
  expect(paragraphs).toBeGreaterThanOrEqual(4)
})
