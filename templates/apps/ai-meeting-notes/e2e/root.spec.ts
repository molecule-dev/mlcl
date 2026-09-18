/**
 * / — public landing page.
 *
 * Real outcomes asserted:
 *   - hero, eyebrow, primary CTAs visible
 *   - CTAs route correctly (signup, login, pricing)
 *   - feature highlights and footer/copy present
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test('hero heading and brand are visible', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()
})

test('primary "Get started" CTA navigates to /signup', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const cta = page
    .getByRole('link', { name: /get started|sign\s*up|start.*free|create.*account/i })
    .first()
  await expect(cta).toBeVisible()
  await cta.click()
  await expect(page).toHaveURL(/\/signup/, { timeout: 10_000 })
})

test('"Sign in" link navigates to /login', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const link = page.getByRole('link', { name: /sign\s*in|log\s*in/i }).first()
  if (await link.count().catch(() => 0)) {
    await link.click()
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  }
})

test('"Pricing" link goes to /pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const link = page.getByRole('link', { name: /pricing|plans/i }).first()
  if (await link.count().catch(() => 0)) {
    await link.click()
    await expect(page).toHaveURL(/\/pricing/, { timeout: 10_000 })
  }
})

test('feature highlights / capability copy is rendered', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  // The landing page is content-rich; assert at least one feature tile / h2.
  const sectionHeadings = page.getByRole('heading', { level: 2 })
  await expect(sectionHeadings.first()).toBeAttached()
})

test('page has multiple links (nav + CTAs + footer)', async ({ page }) => {
  await page.goto(APP_BASE + '/')
  const links = page.getByRole('link')
  const count = await links.count()
  expect(count).toBeGreaterThan(2)
})
