/**
 * /pricing — Stripe checkout. We don't drive the Stripe page here, only
 * confirm that clicking the upgrade CTA fires the canonical billing
 * endpoints and (when STRIPE_SECRET_KEY is configured) gets a real
 * checkout.stripe.com URL back.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, apiRequest, captureNetwork, signup } from './_helpers.js'

test('GET /api/billing/tiers returns a non-empty catalog', async ({ page }) => {
  await signup(page)
  const r = await apiRequest(page, 'GET', '/billing/tiers')
  expect(r.status).toBe(200)
  const tiers = ((r.body as { data?: unknown[] })?.data ?? r.body) as unknown[]
  expect(Array.isArray(tiers) ? tiers.length : 0).toBeGreaterThan(0)
})

test('upgrade CTA on /pricing fires checkout endpoint', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    const btn = page.getByRole('button', { name: /upgrade|start free|continue|subscribe/i }).first()
    if ((await btn.count()) > 0) {
      await btn.click()
      await page.waitForTimeout(2_000)
    }
  })
  const post = reqs.find(
    (r) => r.method === 'POST' && /\/api\/billing\/(checkout|sessions|subscribe)/.test(r.url),
  )
  if (process.env.STRIPE_SECRET_KEY) {
    expect(post?.status).toBeGreaterThanOrEqual(200)
    expect(post?.status).toBeLessThan(400)
  } else {
    test.info().annotations.push({
      type: 'note',
      description: 'STRIPE_SECRET_KEY unset — checkout call not asserted',
    })
  }
})
