/**
 * /progress — authenticated progress dashboard. Verifies it renders,
 * fetches /api/profile (or similar progress endpoint), and is auth-gated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('/progress renders page-progress container after auth', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.locator('[data-mol-id="page-progress"]')).toBeVisible()
})

test('/progress fetches /api/progress (session validity)', async ({ page }) => {
  await signup(page)
  // Use waitForResponse with a deterministic predicate so we don't race
  // page-rendering vs the in-flight fetch (the page can become visible
  // before useEffect's GET completes).
  const reqs = await captureNetwork(page, async () => {
    const progress = page.waitForResponse(
      (r) => /\/api\/progress/.test(r.url()) && r.request().method() === 'GET',
      { timeout: 15_000 },
    )
    await page.goto(APP_BASE + '/progress')
    await progress
    await expect(page.locator('[data-mol-id="page-progress"]')).toBeVisible()
  })
  expect(reqs.find((r) => /\/api\/progress/.test(r.url) && r.method === 'GET')?.status).toBe(200)
})

test('/progress renders at least one heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.locator('[data-mol-id="page-progress"]')).toBeVisible()
  const count = await page.getByRole('heading').count()
  expect(count).toBeGreaterThanOrEqual(1)
})

test('/progress is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(APP_BASE + '/progress')
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/progress shows "Your learning trajectory" h1', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(
    page.getByRole('heading', { name: /your learning trajectory/i }).first(),
  ).toBeVisible({
    timeout: 10_000,
  })
})

test('/progress shows "This week" KPI label', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByText(/this week/i).first()).toBeVisible({ timeout: 10_000 })
})

test('/progress shows "Avg mastery" KPI label', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByText(/avg\.? mastery/i).first()).toBeVisible({ timeout: 10_000 })
})

test('/progress shows "Recall rate" KPI label', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByText(/recall rate/i).first()).toBeVisible({ timeout: 10_000 })
})

test('/progress shows "Streak" KPI label', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByText(/streak/i).first()).toBeVisible({ timeout: 10_000 })
})

test('/progress shows "Your study minutes" weekly chart heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByRole('heading', { name: /your study minutes/i }).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('/progress shows the chart "Peak:" caption', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByText(/peak:/i).first()).toBeVisible({ timeout: 10_000 })
})

test('/progress shows "Subject trends" section heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  await expect(page.getByRole('heading', { name: /subject trends/i }).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('/progress fresh user with no subjects sees the empty-state hint', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/progress')
  // a fresh user has no subjects yet → empty state in the subjects panel
  await expect(page.getByText(/add courses to see/i).first()).toBeVisible({ timeout: 10_000 })
})
