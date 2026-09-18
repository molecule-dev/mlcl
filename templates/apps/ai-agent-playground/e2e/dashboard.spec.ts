import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, captureNetwork, seedAgent, signup, whereUrl } from './_helpers.js'

test.describe('Dashboard page', () => {
  test('redirects unauthenticated visitors to /login', async ({ page }) => {
    await page.goto(APP_BASE + '/dashboard')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders metric cards and live execution log heading after signup', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible()
    await expect(page.getByText(/Total Runs/i).first()).toBeVisible()
    await expect(page.getByText(/Tokens Processed/i).first()).toBeVisible()
    await expect(page.getByText(/Estimated Cost/i).first()).toBeVisible()
    await expect(page.getByText(/Avg Latency/i).first()).toBeVisible()
    await expect(page.getByText(/Live Execution Log/i).first()).toBeVisible()
  })

  test('shows the empty-agents hint when the user has no agents', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await expect(page.locator('[data-mol-id="dashboard-agents-empty"]')).toBeVisible()
    await expect(page.locator('[data-mol-id="dashboard-runs-empty"]')).toBeVisible()
  })

  test('"View All" link goes to /agents', async ({ page }) => {
    await signup(page)
    await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    await page.getByRole('link', { name: /View All/i }).click()
    await expect(page).toHaveURL(/\/agents$/)
  })

  test('fetches /agents and /executions on load', async ({ page }) => {
    const reqs = await captureNetwork(page, async () => {
      await signup(page)
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      await expect(page.locator('[data-mol-id="page-dashboard"]')).toBeVisible()
      await page.waitForTimeout(800)
    })
    expect(whereUrl(reqs, /\/api\/agents(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
    expect(whereUrl(reqs, /\/api\/executions(?:\?|$)/, 'GET').length).toBeGreaterThan(0)
  })

  test('seeded agent shows up in the active agents grid', async ({ page, request }) => {
    const session = await signup(page)
    await seedAgent(request, session.accessToken!, { name: 'Triage Bot' })
    await page.goto(APP_BASE + '/dashboard')
    await expect(page.getByText('Triage Bot').first()).toBeVisible({ timeout: 10000 })
  })
})
