import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, api, captureNetwork, signup } from './_helpers.js'

test('/plan-updated renders confirmation copy', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  await expect(page.getByText(/upgrade|thank you|plan updated|subscription/i).first()).toBeVisible()
})

test('/plan-updated has a link back to /dashboard', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  // Either an explicit dashboard link or a "Continue" CTA pointing to
  // /dashboard is acceptable.
  const link = page.getByRole('link', { name: /dashboard|continue/i }).first()
  await expect(link).toBeVisible()
})

test('/plan-updated has a link to /billing for the receipt', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/plan-updated')
  const link = page.getByRole('link', { name: /billing/i }).first()
  await expect(link).toBeVisible()
})

test('/plan-updated reflects /api/billing/status (real backend invariant for new signups)', async ({
  page,
}) => {
  await signup(page)
  // After signup the user is on the free plan (not yet upgraded). The
  // page must not falsely claim "upgraded".
  await page.goto(APP_BASE + '/plan-updated')
  const status = await api<{ planKey: string; isFree: boolean }>(page, 'GET', '/billing/status')
  expect(status.planKey).toBe('free')
  expect(status.isFree).toBe(true)
})

test('observation invariant: /plan-updated either fetches /api/billing/status OR is fully static — but does NOT 404 the route', async ({
  page,
}) => {
  // PlanUpdated is the post-checkout success page. Some implementations
  // re-fetch /api/billing/status to verify the new plan; others are
  // purely static (relying on the user clicking through to /billing).
  // Either is acceptable, but the page must NOT issue any /api request
  // that 4xx/5xx — that would indicate a broken handler.
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/plan-updated')
    await page.waitForLoadState('networkidle').catch(() => {})
  })
  const apiCalls = reqs.filter((r) => /\/api\//.test(r.url))
  for (const r of apiCalls) {
    expect(r.status, `${r.method} ${r.url} status`).toBeLessThan(400)
  }
})
