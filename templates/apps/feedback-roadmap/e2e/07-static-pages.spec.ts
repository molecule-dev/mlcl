/**
 * Static + billing surfaces render: pricing, about, legal pages, 404, and
 * the plan-updated page Stripe redirects to.
 */
import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE } from './_helpers.js'

test.describe('static pages', () => {
  test('pricing renders the tier comparison', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /plan/i }).first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('about, terms and privacy render', async ({ page }) => {
    await page.goto(APP_BASE + '/about')
    await expect(page.getByRole('heading', { name: /^about/i }).first()).toBeVisible({
      timeout: 15000,
    })
    await page.goto(APP_BASE + '/terms')
    await expect(page.locator('main')).toContainText(/terms/i, { timeout: 15000 })
    await page.goto(APP_BASE + '/privacy')
    await expect(page.locator('main')).toContainText(/privacy/i, { timeout: 15000 })
  })

  test('unknown route renders the 404 page', async ({ page }) => {
    await page.goto(APP_BASE + '/this-route-does-not-exist')
    await expect(page.getByRole('heading', { name: /missing|roadmap|404/i }).first()).toBeVisible({
      timeout: 15000,
    })
  })

  test('plan-updated renders outside auth', async ({ page }) => {
    await page.goto(APP_BASE + '/plan-updated')
    // The shell renders an <h1> title band while PlanUpdatedPage renders its
    // own inner <main> with <h2>s — the page carries TWO <main>s plus <body>,
    // so locator('main').or(locator('body')) strict-violates (3 matches).
    // Level-pin to the single <h1> ("Your plan has been updated.") instead.
    await expect(page.getByRole('heading', { level: 1, name: /plan/i })).toBeVisible({
      timeout: 15000,
    })
  })
})
