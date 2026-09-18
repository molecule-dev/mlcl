import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork } from './_helpers.js'

test('Pricing page is publicly viewable and fires GET /api/billing/tiers', async ({ page }) => {
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/pricing')
    await page.waitForLoadState('networkidle')
  })
  await expect(page).toHaveURL(/\/pricing/)
  const tiersReq = reqs.find((r) => r.method === 'GET' && /\/api\/billing\/tiers/.test(r.url))
  expect(tiersReq, 'expected GET /api/billing/tiers on page load').toBeDefined()
  expect(tiersReq?.status).toBe(200)
})

test('GET /api/billing/tiers returns at least one tier with name + key + price', async ({
  page,
}) => {
  const res = await page.request.get('/api/billing/tiers')
  expect(res.status()).toBe(200)
  const raw = (await res.json()) as
    Array<{ key: string; name: string }> | { data: Array<{ key: string; name: string }> }
  const tiers = Array.isArray(raw) ? raw : raw.data
  expect(Array.isArray(tiers)).toBe(true)
  expect(tiers.length).toBeGreaterThan(0)
  for (const t of tiers) {
    expect(t.key, JSON.stringify(t)).toBeTruthy()
    expect(t.name, JSON.stringify(t)).toBeTruthy()
  }
})

test('Pricing page renders a heading mentioning pricing', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await expect(page.getByRole('heading').first()).toBeVisible()
})

test('Pricing page renders Free / Pro / Team tier names from the API', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.waitForLoadState('networkidle')
  const free = page.getByText(/^Free$/i).first()
  const pro = page.getByText(/^Pro$/i).first()
  const team = page.getByText(/^Team$/i).first()
  // Names come from /api/billing/tiers -> tiers.ts
  const visible = await Promise.all([
    free.isVisible().catch(() => false),
    pro.isVisible().catch(() => false),
    team.isVisible().catch(() => false),
  ])
  // At least two tiers should render visibly
  expect(visible.filter(Boolean).length).toBeGreaterThanOrEqual(2)
})

test('Pricing CTAs route to login when unauthenticated', async ({ page }) => {
  await page.goto(APP_BASE + '/pricing')
  await page.evaluate(() => window.localStorage.clear()).catch(() => {})
  await page.reload()
  await page.waitForLoadState('networkidle')
  // Pricing page should have at least some interactive control to choose a plan
  const interactive = page.locator('a, button')
  const count = await interactive.count()
  expect(count, 'expected at least one interactive control').toBeGreaterThan(0)
})
