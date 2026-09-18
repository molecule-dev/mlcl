import { test, expect } from '@molecule/app-e2e-fixtures-default'

import { APP_BASE, signup } from './_helpers.js'

test.describe('Models registry page', () => {
  test('redirects unauthenticated visitors', async ({ page }) => {
    await page.goto(APP_BASE + '/models')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })

  test('renders the registry table with provider/cost columns and known SKUs', async ({ page }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    await expect(page.locator('[data-mol-id="page-models"]')).toBeVisible()
    for (const heading of ['Model', 'Provider', 'Context', 'Avg Latency', 'Status']) {
      await expect(page.getByText(new RegExp(heading, 'i')).first()).toBeVisible()
    }
    await expect(page.getByText('claude-opus-4-7').first()).toBeVisible()
    await expect(page.getByText('gpt-4o').first()).toBeVisible()
    await expect(page.getByText('gemini-2.5-pro').first()).toBeVisible()
  })

  test('reload preserves the registry table render (no client-state hydration loss)', async ({
    page,
  }) => {
    await signup(page)
    await page.goto(APP_BASE + '/models')
    await expect(page.locator('[data-mol-id="page-models"]')).toBeVisible()
    await page.reload()
    await expect(page.locator('[data-mol-id="page-models"]')).toBeVisible()
    await expect(page.getByText('claude-opus-4-7').first()).toBeVisible()
  })
})
