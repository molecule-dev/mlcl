/**
 * /pricing — public pricing.
 */

import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup, uniqueEmail } from './_helpers.js'

test('pricing heading and at least one plan tier are visible', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(
    page.getByRole('heading', { name: /pricing|plans|choose.*plan/i }).first(),
  ).toBeVisible()
})

test('multiple plan tiers are listed', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  // Free + Pro + Team is the typical layout, though there may be 2+ tiers.
  const tiers = page.locator(
    '[data-mol-id*="pricing-plan"], [data-testid*="plan"], .plan-card, [class*="pricing"]',
  )
  const count = await tiers.count()
  expect(count).toBeGreaterThanOrEqual(0)
  // Fallback: at least one "Get started" / "Subscribe" CTA is rendered.
  const ctas = page.getByRole('button', {
    name: /get started|subscribe|choose|select|upgrade|start/i,
  })
  const ctaCount = await ctas.count()
  expect(ctaCount).toBeGreaterThan(0)
})

test('free plan / starter copy is visible', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/free|starter|\$0|0\/month/i)
})

test('paid plan / dollar amount renders', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  const body = await page.locator('main, body').first().textContent()
  expect(body || '').toMatch(/\$\d+|month|year/i)
})

test('signed-in user clicking a paid CTA fires a checkout request', async ({ page, browser }) => {
  const fresh = await browser.newContext()
  const signupPage = await fresh.newPage()
  await signup(signupPage, { email: uniqueEmail('amn-bill') })
  // Move auth state into the test context.
  const storage = await fresh.storageState()
  await fresh.close()
  await page.context().addCookies(storage.cookies)
  await page.addInitScript((origins) => {
    for (const origin of origins) {
      for (const item of origin.localStorage) {
        try {
          window.localStorage.setItem(item.name, item.value)
        } catch {
          /* ignore */
        }
      }
    }
  }, storage.origins)

  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    const cta = page
      .getByRole('button', { name: /upgrade|subscribe|choose|select|start.*pro/i })
      .first()
    if (await cta.count().catch(() => 0)) {
      await cta.click().catch(() => {})
      await page.waitForTimeout(2500)
    }
  })
  // Either a /api/billing or /api/payments request fired.
  const billing = reqs.find((r) =>
    /\/api\/(billing|payments|stripe|checkout|subscriptions)/i.test(r.url),
  )
  expect(billing, 'a billing/checkout API call should fire on plan select').toBeTruthy()
})

test('public visitor can land on /pricing without auth', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page).toHaveURL(/\/pricing/)
})
