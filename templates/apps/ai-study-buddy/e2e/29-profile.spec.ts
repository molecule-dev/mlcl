/**
 * /profile — authenticated profile page. Verifies the page renders,
 * /api/profile is fetched, profile data is displayed, and the page
 * is auth-gated.
 */
import { expect, test } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, signup } from './_helpers.js'

test('/profile renders page-profile container after auth', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await expect(page.locator('[data-mol-id="page-profile"]')).toBeVisible()
})

test('/profile fetches /api/profile on mount', async ({ page }) => {
  await signup(page)
  const reqs = await captureNetwork(page, async () => {
    await page.goto(APP_BASE + '/profile')
    await expect(page.locator('[data-mol-id="page-profile"]')).toBeVisible()
  })
  expect(reqs.find((r) => /\/api\/profile/.test(r.url) && r.method === 'GET')?.status).toBe(200)
})

test('/profile shows the signed-in user email or name somewhere on the page', async ({ page }) => {
  const { email } = await signup(page)
  await page.goto(APP_BASE + '/profile')
  // The profile page renders user metadata; either the email or the local-part should be present
  const localPart = email.split('@')[0]
  const text = await page.locator('body').innerText()
  expect(text.includes(email) || text.includes(localPart)).toBeTruthy()
})

test('/profile is auth-gated (anon redirects to /login)', async ({ page }) => {
  await page.goto(APP_BASE + '/profile')
  await page.waitForURL(/\/login/, { timeout: 8_000 })
})

test('/profile renders the "Your profile" heading once data has loaded', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByRole('heading', { name: /your profile/i }).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('/profile shows "Member since {year}" derived from created_at', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByText(/member since\s*\d{4}/i).first()).toBeVisible({ timeout: 10_000 })
})

test('/profile renders all four KPI tiles (subjects, hours, quizzes, badges)', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByText(/active subjects/i).first()).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText(/total hours/i).first()).toBeVisible()
  await expect(page.getByText(/quizzes taken/i).first()).toBeVisible()
  await expect(page.getByText(/badges earned/i).first()).toBeVisible()
})

test('/profile renders the Achievements section heading', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByRole('heading', { name: /achievements/i }).first()).toBeVisible({
    timeout: 10_000,
  })
})

test('/profile KPI: total hours tile renders a number', async ({ page }) => {
  await signup(page)
  await page.goto(APP_BASE + '/profile')
  await expect(page.getByText(/total hours/i).first()).toBeVisible({ timeout: 10_000 })
  // KPI tiles render the metric value next to the label — read body and look for digits near "Total hours"
  const body = await page.locator('body').innerText()
  expect(body).toMatch(/total hours/i)
  // For a brand-new user this should be 0 (no recorded study minutes yet)
  const m =
    body.match(/(\d+(?:\.\d+)?)\s*(?:hrs?|hours?)?\s*[\s\S]{0,40}total hours/i) ||
    body.match(/total hours[\s\S]{0,40}(\d+(?:\.\d+)?)/i)
  expect(m?.[1]).toBeDefined()
})
