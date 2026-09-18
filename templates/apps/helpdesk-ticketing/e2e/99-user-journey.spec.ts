import { expect, test } from '@molecule/app-e2e-fixtures-default'

import {
  API_BASE,
  APP_BASE,
  authHeaders,
  getAccessToken,
  promoteToAdmin,
  signup,
  uniqueEmail,
} from './_helpers.js'

/**
 * Cross-page kitchen-sink journey: signup → dashboard → tickets list →
 * /tickets/new (UI create) → /tickets/:id (status change) → reply →
 * /knowledge-base (article create) → /reports → /settings → /pricing →
 * billing checkout (real Stripe URL) → /api/billing/cancel.
 *
 * Every backend invariant is verified by a follow-up GET — never by
 * "POST happened". Read-after-write is the contract.
 */
test('user journey: signup → tickets CRUD → kb → reports → settings → billing checkout', async ({
  page,
}) => {
  test.setTimeout(180_000)

  // 1. Signup → /
  const email = uniqueEmail('journey')
  await signup(page, email, 'Journey1Pass!')
  const accessToken = await getAccessToken(page)
  expect(accessToken ?? '').not.toBe('')

  // This journey drives operator-only surfaces (full status ladder incl.
  // 'resolved', KB article authoring) gated behind requireAdmin /
  // isHelpdeskAdmin. Become the operator before exercising them.
  await promoteToAdmin(page, accessToken)

  // 2. Dashboard renders without role=alert
  await page.goto(APP_BASE + '/')
  await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('[role=alert]')).toHaveCount(0)

  // 3. /tickets/new — UI-driven create with verified read-after-write
  const subject = `Journey ticket ${Date.now()}`
  await page.goto(APP_BASE + '/tickets/new')
  await page.locator('[data-mol-id="ticket-subject"]').fill(subject)
  await page.locator('[data-mol-id="ticket-description"]').fill('Journey description')
  await page.locator('[data-mol-id="ticket-priority"]').selectOption('high')
  await page.locator('[data-mol-id="ticket-new-submit"]').click()
  await expect(page).toHaveURL(/\/tickets\/[0-9a-f-]{8,}$/i, { timeout: 15_000 })
  const ticketId = page.url().split('/tickets/')[1]!

  // 4. Detail page status change persists across reload
  await page.locator('[data-mol-id="status-select"]').selectOption('resolved')
  await expect(page.locator('[data-mol-id="badge-status"]').first()).toHaveText(/resolved/i, {
    timeout: 10_000,
  })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('[data-mol-id="badge-status"]').first()).toHaveText(/resolved/i)

  // 5. Reply persists via API; surfaces in next GET
  const replyBody = `Journey reply ${Date.now()}`
  const replyRes = await page.request.post(`${API_BASE}/tickets/${ticketId}/replies`, {
    headers: authHeaders(accessToken),
    data: { body: replyBody, is_internal: false },
  })
  expect(replyRes.status()).toBeLessThan(400)
  const detailRes = await page.request.get(`${API_BASE}/tickets/${ticketId}`, {
    headers: authHeaders(accessToken),
  })
  const detail = (await detailRes.json()) as { replies?: Array<{ body: string }> }
  expect((detail.replies ?? []).some((r) => r.body === replyBody)).toBe(true)

  // 6. Tickets list contains the freshly-created subject
  await page.goto(APP_BASE + '/tickets')
  await expect(page.getByText(subject).first()).toBeVisible({ timeout: 15_000 })

  // 7. Knowledge base — create article via API + verify it surfaces
  const articleTitle = `Journey article ${Date.now()}`
  const artRes = await page.request.post(`${API_BASE}/articles`, {
    headers: authHeaders(accessToken),
    data: { title: articleTitle, body: 'Journey body', status: 'published' },
  })
  expect(artRes.status()).toBeLessThan(400)
  await page.goto(APP_BASE + '/knowledge-base')
  await expect(page.locator('body')).toContainText(articleTitle, { timeout: 15_000 })

  // 8. Reports renders without RootErrorBoundary
  await page.goto(APP_BASE + '/reports')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page.locator('[role=alert]')).toHaveCount(0)

  // 9. Settings page hydrates from /api/users/me
  await page.goto(APP_BASE + '/settings')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page.locator('[role=alert]')).toHaveCount(0)

  // 10. /pricing renders 3 tiers and uses the http-default bond's /api/billing/tiers
  const calls: string[] = []
  page.on('response', (r) => calls.push(r.url()))
  await page.goto(APP_BASE + '/pricing')
  await expect(page.locator('body')).toContainText(/Pro/i, { timeout: 15_000 })
  await expect(page.locator('[role=alert]')).toHaveCount(0)
  expect(calls.some((u) => u.includes('/api/billing/tiers'))).toBe(true)

  // 11. Billing checkout returns a real Stripe URL for Pro Monthly
  const tiersRes = await page.request.get(`${API_BASE}/billing/tiers`)
  const tiers = (await tiersRes.json()) as {
    data: Array<{ key: string; prices: Array<{ period: string; stripePriceId: string | null }> }>
  }
  const proMonthly = tiers.data
    .find((t) => t.key === 'pro')!
    .prices.find((p) => p.period === 'month')?.stripePriceId
  expect(proMonthly ?? '').toMatch(/^price_/)
  const checkout = await page.request.post(`${API_BASE}/billing/checkout`, {
    headers: authHeaders(accessToken),
    data: { priceId: proMonthly },
  })
  expect(checkout.status()).toBe(200)
  const checkoutBody = (await checkout.json()) as { checkoutUrl?: string }
  expect(checkoutBody.checkoutUrl ?? '').toMatch(/^https:\/\/checkout\.stripe\.com\//)

  // 12. /api/billing/cancel without an active subscription returns 4xx, not 5xx
  const cancel = await page.request.post(`${API_BASE}/billing/cancel`, {
    headers: authHeaders(accessToken),
    failOnStatusCode: false,
  })
  expect(cancel.status()).toBeLessThan(500)
  expect(cancel.status()).toBeGreaterThanOrEqual(400)
})
