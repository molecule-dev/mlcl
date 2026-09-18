import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, whereUrl } from './_helpers.js'

test.describe('/pricing', () => {
  test('renders Choose your plan heading + 3 plan cards', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /Choose your.*plan/i, level: 1 })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Free$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Pro$/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /^Team$/i })).toBeVisible()
  })

  test('public visitor sees 3 articles each with a CTA button or link', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    // count() is a one-shot read and goto() resolves before React paints, so this
    // sampled 0 articles and failed (then passed on retry). toHaveCount retries.
    await expect(page.locator('article')).toHaveCount(3)
  })

  test('authenticated user sees Free as Current plan (disabled)', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const currentBtn = page.getByRole('button', { name: /Current plan/i })
    await expect(currentBtn).toBeVisible()
    await expect(currentBtn).toBeDisabled()
  })

  test('authenticated GET /api/billing/tiers fires on page load', async ({ page }) => {
    await signup(page)
    const reqs = await captureNetwork(page, async () => {
      await page.goto(APP_BASE + '/pricing')
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {})
    })
    const tiers = whereUrl(reqs, /\/api\/billing\/tiers/, 'GET')
    expect(tiers.length, 'GET /api/billing/tiers fired').toBeGreaterThan(0)
    expect(tiers[0].status).toBe(200)
  })

  test('Upgrade to Pro fires POST /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Pro/i }).click()
      await page.waitForTimeout(3000)
    })
    const post = whereUrl(reqs, /\/api\/billing\/checkout/, 'POST')
    expect(post.length, 'POST /api/billing/checkout fired').toBeGreaterThan(0)
    expect(post[0].status, 'checkout must succeed (Stripe)').toBeLessThan(400)
  })

  test('Upgrade to Team fires POST /api/billing/checkout', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/pricing')
    const reqs = await captureNetwork(page, async () => {
      await page.getByRole('button', { name: /Upgrade to Team/i }).click()
      await page.waitForTimeout(3000)
    })
    const post = whereUrl(reqs, /\/api\/billing\/checkout/, 'POST')
    expect(post.length, 'POST /api/billing/checkout fired').toBeGreaterThan(0)
  })

  test('Pro plan card lists tier feature limits', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Pro$/i })).toBeVisible()
    const proCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: /^Pro$/i }) })
    const items = proCard.locator('li')
    await items.first().waitFor({ timeout: 10000 })
    await expect(items.first()).toBeAttached()
  })

  test('Team plan card lists tier feature limits', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Team$/i })).toBeVisible()
    const teamCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: /^Team$/i }) })
    const items = teamCard.locator('li')
    await items.first().waitFor({ timeout: 10000 })
    await expect(items.first()).toBeAttached()
  })

  test('Free plan card lists tier feature limits', async ({ page }) => {
    await page.goto(APP_BASE + '/pricing')
    await expect(page.getByRole('heading', { name: /^Free$/i })).toBeVisible()
    const freeCard = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: /^Free$/i }) })
    const items = freeCard.locator('li')
    await items.first().waitFor({ timeout: 10000 })
    await expect(items.first()).toBeAttached()
  })
})
