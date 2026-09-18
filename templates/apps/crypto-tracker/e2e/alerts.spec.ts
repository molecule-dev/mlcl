import { test, expect } from '@molecule/app-e2e-fixtures-default'
import { API_BASE, signup } from './_helpers.js'

test('alerts list shows seeded alerts with proper UI shape (active / threshold / coin_name)', async ({
  page,
}) => {
  await signup(page)
  // The per-user seed (which populates `price_alerts`) is triggered
  // lazily by GET /api/reports/portfolio_stats — fire it explicitly and
  // wait for it to finish before we read the alerts list. Otherwise we
  // race the dashboard's background mount.
  await page.request.get(`${API_BASE}/reports/portfolio_stats`, { failOnStatusCode: false })
  await page.goto('/alerts')
  await expect(page.getByRole('heading', { name: /alerts/i })).toBeVisible()

  // Poll /api/alerts until rows arrive (seed is idempotent and synchronous
  // server-side, but the fetch above could still complete its commit after
  // we navigate). Playwright's `expect.poll` retries until the matcher
  // passes or the timeout hits.
  const fetchAlerts = async () => {
    const r = await page.request.get(`${API_BASE}/alerts`, { failOnStatusCode: false })
    const d = (await r.json()) as unknown[] | { data?: unknown[] }
    return Array.isArray(d) ? d : ((d as { data?: unknown[] }).data ?? [])
  }

  await expect
    .poll(async () => (await fetchAlerts()).length, { timeout: 10_000 })
    .toBeGreaterThan(0)

  const data = await fetchAlerts()
  const sample = data[0] as { active: unknown; threshold: unknown; coin_name: unknown }
  expect(sample).toHaveProperty('active')
  expect(sample).toHaveProperty('threshold')
  expect(sample).toHaveProperty('coin_name')
  expect(typeof sample.threshold).toBe('number')
})

test('create alert via /alerts/new actually POSTs to backend and shows in list', async ({
  page,
}) => {
  await signup(page)
  await page.goto('/alerts/new')
  await expect(page.getByRole('heading', { name: /new alert/i })).toBeVisible()

  await page.locator('input[type="text"]').fill('LINK')
  await page.locator('select').selectOption('above')
  await page.locator('input[type="number"]').fill('25')
  await page.getByRole('button', { name: /create alert/i }).click()

  await expect(page).toHaveURL(/\/alerts$/, { timeout: 8_000 })

  // Backend invariant: alert exists for LINK above $25
  const listResp = await page.request.get(`${API_BASE}/alerts`, { failOnStatusCode: false })
  const listJson = (await listResp.json()) as unknown[] | { data?: unknown[] }
  const data = Array.isArray(listJson) ? listJson : ((listJson as { data?: unknown[] }).data ?? [])
  const link = data.find(
    (a: unknown) =>
      (a as { symbol: string; threshold: number }).symbol === 'LINK' &&
      (a as { symbol: string; threshold: number }).threshold === 25,
  )
  expect(link, 'newly-created LINK $25 alert should exist server-side').toBeTruthy()
})

test('delete alert removes the row in DB', async ({ page }) => {
  await signup(page)
  // Create an alert we can delete
  const createResp = await page.request.post(`${API_BASE}/alerts`, {
    data: {
      symbol: 'sol',
      condition: 'below',
      target_price: 100,
      channels: ['email'],
      repeat: 'one-time',
    },
    failOnStatusCode: false,
  })
  const created = (await createResp.json()) as { id: string }
  expect(created.id).toBeTruthy()

  await page.goto('/alerts')
  // Best-effort delete via API path; UI delete button is on the card
  const deleteResp = await page.request.delete(`${API_BASE}/alerts/${created.id}`, {
    failOnStatusCode: false,
  })
  expect(deleteResp.status()).toBe(204)

  // Backend invariant: gone
  const afterResp = await page.request.get(`${API_BASE}/alerts`, { failOnStatusCode: false })
  const afterJson = (await afterResp.json()) as unknown[] | { data?: unknown[] }
  const after = Array.isArray(afterJson)
    ? afterJson
    : ((afterJson as { data?: unknown[] }).data ?? [])
  expect(after.find((a: unknown) => (a as { id: string }).id === created.id)).toBeFalsy()
})
